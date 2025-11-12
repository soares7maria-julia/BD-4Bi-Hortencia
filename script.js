// node.js
const { query, testConnection } = require('database.js');

async function verificarDependencias() {
  // Testa a conexão
  const conectado = await testConnection();
  if (!conectado) {
    console.error("❌ Falha ao conectar no banco. Encerrando execução.");
    process.exit(1);
  }

  console.log("==");
  console.log("== Descobridor de Dependências Funcionais (DFs) ==");
  console.log("==\n");

  // Descobre automaticamente a primeira tabela do banco
  const resultadoTabelas = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    LIMIT 1;
  `);

  const nomeTabela = resultadoTabelas.rows[0]?.table_name;
  if (!nomeTabela) {
    console.error("❌ Nenhuma tabela encontrada no banco!");
    process.exit(1);
  }

  console.log('Tabela detectada automaticamente: ${nomeTabela}\n');

  // Busca os nomes das colunas
  const resultadoColunas = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = '${nomeTabela}';
  `);

  const lista_atributos = resultadoColunas.rows.map(r => r.column_name);
  console.log('Colunas encontradas: ${lista_atributos.join(', ')}\n');


/*   const sql = SELECT * FROM funcionarios;

  const resultado = await query(sql);

   console.log(resultado.rows); */


  for (const lado_direito of lista_atributos) {
    for (const lado_esquerdo of lista_atributos) {



      if(lado_direito === lado_esquerdo){
        continue;
      }

      /*  console.log(${lado_esquerdo} -> ${lado_direito}); */


      const sql = `
        SELECT ${lado_esquerdo}
        FROM ${nomeTabela}
        GROUP BY ${lado_esquerdo}
        HAVING COUNT(DISTINCT ${lado_direito}) > 1;
      `;

      console.log('Executando ${sql}\n');

      const resultado = await query(sql);


      if (resultado.rows.length > 0) {
        // console.log('Total:', resultado.rows[0])
      } else {


        // voce tem o caso de que eh uma df
         console.log('${lado_esquerdo} -> ${lado_direito} é DF');

         /*console.log('Total:', resultado.rows[0])  */


      }

      // console.log(${resultado}\n);


    }

  }



















  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  /* // ============ 2 LAÇOS: A -> B ============
  for (const coluna1 of lista_atributos) {
    for (const coluna2 of lista_atributos) {
      if (coluna1 === coluna2) continue;

      const consulta1 = `
        SELECT *
        FROM ${nomeTabela}
        GROUP BY ${coluna1}
        HAVING COUNT(DISTINCT ${coluna2}) > 1;
      `;

      const resultado = await query(consulta1);

      if (resultado.rows.length === 0) {
        console.log(✅ ${coluna1} -> ${coluna2} é DF);
      }
    }
  }

  // ============ 3 LAÇOS: AB -> C ============
  for (const coluna1 of lista_atributos) {
    for (const coluna2 of lista_atributos) {
      if (coluna1 === coluna2) continue;

      for (const coluna3 of lista_atributos) {
        if (coluna3 === coluna1 || coluna3 === coluna2) continue;

        const consulta2 = `
          SELECT *
          FROM ${nomeTabela}
          GROUP BY ${coluna1}, ${coluna2}
          HAVING COUNT(DISTINCT ${coluna3}) > 1;
        `;

        const resultado = await query(consulta2);

        console.log(resultado);

        if (resultado.rows.length === 0) {
          console.log(✅ ${coluna1}, ${coluna2} -> ${coluna3} é DF);
        }
      }
    }
  }

  // ============ 4 LAÇOS: ABC -> D ============
  for (const coluna1 of lista_atributos) {
    for (const coluna2 of lista_atributos) {
      if (coluna1 === coluna2) continue;

      for (const coluna3 of lista_atributos) {
        if (coluna3 === coluna1 || coluna3 === coluna2) continue;

        for (const coluna4 of lista_atributos) {
          if ([coluna1, coluna2, coluna3].includes(coluna4)) continue;

          const consulta3 = `
            SELECT *
            FROM ${nomeTabela}
            GROUP BY ${coluna1}, ${coluna2}, ${coluna3}
            HAVING COUNT(DISTINCT ${coluna4}) > 1;
          `;

          const resultado = await query(consulta3);

          if (resultado.rows.length === 0) {
            console.log(✅ ${coluna1}, ${coluna2}, ${coluna3} -> ${coluna4} é DF);
          }
        }
      }
    }
  }

  console.log("\n✅ Verificação concluída!"); */
}

// Executa o script
verificarDependencias().catch(err => console.error("Erro geral:", err));