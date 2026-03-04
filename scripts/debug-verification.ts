import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debug() {
  // 查看核销表中关联的 PO ID
  const verificationResult = await pool.query(`
    SELECT id, po_id, payment_id 
    FROM cached_verification 
    LIMIT 5
  `);
  console.log('现有核销记录:', verificationResult.rows);

  // 查看一个失败的核销记录示例
  const failedVerification = await pool.query(`
    SELECT v.id, v.po_id, v.raw_data
    FROM cached_verification v
    RIGHT JOIN cached_po p ON v.po_id = p.id
    WHERE p.id IS NULL
    LIMIT 1
  `);
  console.log('失败的核销记录（关联的 PO 不存在）:', failedVerification.rows);

  await pool.end();
}

debug().catch(console.error);
