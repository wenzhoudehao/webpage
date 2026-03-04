import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debug() {
  // 查看 Airtable API_Sync_Active 视图中的核销记录
  // 这些记录引用的 PO 是否都在缓存表中？

  // 1. 查看缓存表中的核销记录
  const cachedVerifications = await pool.query(`
    SELECT id, po_id, payment_id 
    FROM cached_verification
    ORDER BY id
    LIMIT 10
  `);
  console.log('缓存表中的核销记录 (前10条):');
  console.log(cachedVerifications.rows);

  // 2. 检查外键约束 - 查看核销记录的 po_id 是否都在 cached_po 中
  const orphanVerifications = await pool.query(`
    SELECT v.id, v.po_id
    FROM cached_verification v
    LEFT JOIN cached_po p ON v.po_id = p.id
    WHERE p.id IS NULL
    LIMIT 10
  `);
  console.log('\n孤立核销记录（po_id 不存在于 cached_po）:');
  console.log(orphanVerifications.rows);

  // 3. 检查表结构
  const tableConstraints = await pool.query(`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'cached_verification'
  `);
  console.log('\n表约束:');
  console.log(tableConstraints.rows);

  await pool.end();
}

debug().catch(console.error);
