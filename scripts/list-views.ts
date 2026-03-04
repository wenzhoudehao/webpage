import 'dotenv/config';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ORDER;

async function listViews() {
  const response = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );
  const data = await response.json();

  for (const table of data.tables) {
    if (['PO', '收款登记', '收款_中间表'].includes(table.name)) {
      console.log(`\n📌 ${table.name}:`);
      console.log(`   Views: ${table.views.map((v: any) => v.name).join(', ')}`);
    }
  }
}

listViews();
