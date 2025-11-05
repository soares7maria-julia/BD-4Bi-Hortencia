// npm install pg readline-sync

const { Client } = require('pg');
const readline = require('readline-sync');

// ================= CONFIG DB =================
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'hortencia',  // ajuste se precisar
  user: 'postgres',
  password: '774499'
});

// ================= util: gerar combinações até tamanho 3 =================
function gerarCombinacoesLimitadas(colunas, maxSize = 3) {
  const n = colunas.length;
  const combos = [];
  const maxMask = 1 << n;
  for (let mask = 1; mask < maxMask; mask++) {
    // contar bits (tamanho do conjunto)
    let size = 0;
    for (let b = 0; b < n; b++) if (mask & (1 << b)) size++;
    if (size <= maxSize) {
      const conjunto = [];
      for (let b = 0; b < n; b++) if (mask & (1 << b)) conjunto.push(colunas[b]);
      combos.push(conjunto);
    }
  }
  // ordenar por tamanho (1,2,3) para garantir que verificações menores ocorram antes
  combos.sort((a, b) => a.length - b.length);
  return combos;
}

// ================= verifica dependência no Postgres (usa ROW(...)) =================
async function verificarDependencia(tabela, lhs, rhs) {
  // monta colunas com aspas (identifier quoting)
  const lhsQuoted = lhs.map(c => `"${c}"`).join(', ');
  const rhsQuoted = `"${rhs}"`;
  const tabelaQuoted = `"${tabela}"`;

  const sql = `
    SELECT
      COUNT(DISTINCT ROW(${lhsQuoted})) AS total_lhs,
      COUNT(DISTINCT ROW(${lhsQuoted}, ${rhsQuoted})) AS total_lhs_rhs
    FROM ${tabelaQuoted};
  `;

  const res = await client.query(sql);
  const totalLHS = Number(res.rows[0].total_lhs);
  const totalLHSRHS = Number(res.rows[0].total_lhs_rhs);
  return totalLHS === totalLHSRHS;
}

// ================= checa se existe subset já determinante (para garantir minimalidade) =================
function hasDeterminingSubset(lhs, rhs, foundMap) {
  // foundMap: Map<rhs, Set<lhsString>>
  // gerar todos os subconjuntos próprios não vazios de lhs
  const n = lhs.length;
  const lhsIndices = lhs.map((_, i) => i);
  const maxMask = 1 << n;
  for (let mask = 1; mask < maxMask; mask++) {
    // ignorar máscara igual ao conjunto todo
    if (mask === (maxMask - 1)) continue;
    // construir subset
    const subset = [];
    for (let b = 0; b < n; b++) if (mask & (1 << b)) subset.push(lhs[b]);
    const key = subset.join(',');
    if (foundMap.has(rhs) && foundMap.get(rhs).has(key)) return true;
  }
  return false;
}

// ================= MAIN =================
async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to database.');

    const tabelaInput = readline.question('Enter the table name: ');
    const tabela = tabelaInput.toLowerCase(); // geralmente tabelas são criadas em minúsculas

    // pega colunas da tabela
    const colunasRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = '${tabela}'
      ORDER BY ordinal_position;
    `);

    if (colunasRes.rows.length === 0) {
      console.log(`⚠️ Table "${tabela}" not found or has no columns.`);
      await client.end();
      return;
    }

    const colunas = colunasRes.rows.map(r => r.column_name);
    console.log(`\n📋 Columns found: ${colunas.join(', ')}`);

    // gerar combinações limitadas (até 3 atributos no LHS)
    const combinacoes = gerarCombinacoesLimitadas(colunas, 3);

    // mapa para armazenar dependências válidas encontradas:
    // Map<rhs, Set<lhsString>>
    const foundMap = new Map();
    const results = [];

    console.log('\n🔍 Checking functional dependencies (LHS size 1..3) ...');

    for (let lhs of combinacoes) {
      for (let rhs of colunas) {
        if (lhs.includes(rhs)) continue; // trivial, pular

        // se já existe um subconjunto de lhs que determina rhs, então não queremos LHS não-minimal
        if (hasDeterminingSubset(lhs, rhs, foundMap)) {
          continue; // já existe subconjunto determinante -> ignora esse LHS (não é minimal)
        }

        // verifica no banco
        let ok;
        try {
          ok = await verificarDependencia(tabela, lhs, rhs);
        } catch (err) {
          console.error('SQL error while checking:', err.message);
          ok = false;
        }

        if (ok) {
          const lhsKey = lhs.join(',');
          // guarda no mapa
          if (!foundMap.has(rhs)) foundMap.set(rhs, new Set());
          if (!foundMap.get(rhs).has(lhsKey)) {
            foundMap.get(rhs).add(lhsKey);
            const depStr = `${lhs.join(',')} -> ${rhs}`;
            results.push(depStr);
            console.log(`✅ ${depStr}`);
          }
        }
      }
    }

    if (results.length === 0) {
      console.log('\n❌ No valid functional dependencies found (with LHS size <= 3).');
    } else {
      console.log(`\n✅ Found ${results.length} valid (minimal) dependencies:`);
      for (let d of results) console.log('  ' + d);
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
    console.log('\nDisconnected from database.');
  }
}

main();
