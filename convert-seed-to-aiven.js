// convert-seed-to-aiven.js - Converts seed_data.sql to Aiven-compatible format
// Replaces INSERT...SELECT subqueries with direct ID values

const fs = require('fs');
const path = require('path');

console.log('🔄 Converting seed_data.sql to Aiven-compatible format...');
console.log('');

// Read the original seed file
const inputFile = path.join(__dirname, 'database', 'seed_data.sql');
const outputFile = path.join(__dirname, 'database', 'seed_data_aiven.sql');

let sql = fs.readFileSync(inputFile, 'utf8');

// =====================================================
// USER ID MAPPINGS (based on INSERT order)
// =====================================================
const userEmailToId = {
    'admin@localconnect.com': 1,
    'customer1@test.com': 2,
    'customer2@test.com': 3,
    'customer3@test.com': 4,
    'customer4@test.com': 5,
    'customer5@test.com': 6,
    'hauwa.bello@email.com': 7,
    'usman.garba@email.com': 8,
    'khadija.musa@email.com': 9,
    'ahmad.ibrahim@email.com': 10,
    'habiba.sule@email.com': 11,
    'yusuf.danladi@email.com': 12,
    'amina.aliyu@email.com': 13,
    'bilal.umar@email.com': 14,
    'safiya.bashir@email.com': 15,
    'ismail.hassan@email.com': 16,
    'maryam.yusuf@email.com': 17,
    'abdulrahman.ali@email.com': 18,
    'halima.ahmed@email.com': 19,
    'suleiman.baba@email.com': 20,
    'rukayya.sani@email.com': 21,
    'bashir.yakubu@email.com': 22,
    'asmau.muhammad@email.com': 23,
    'mohammed.kabir@email.com': 24,
    'halima.adamu@email.com': 25,
    'nuhu.shehu@email.com': 26,
    'nafisa.lawal@email.com': 27,
    'sadiq.musa@email.com': 28,
    'rahma.bello@email.com': 29,
    'aliyu.ahmad@email.com': 30,
    'zulaiha.umar@email.com': 31,
    'haruna.idris@email.com': 32,
    'hadiza.yusuf@email.com': 33,
    'kabir.usman@email.com': 34,
    'sumaiya.ali@email.com': 35,
    'bashir.salisu@email.com': 36,
    'jamila.bala@email.com': 37,
    'ibrahim.abubakar@email.com': 38,
    'mariya.garba@email.com': 39,
    'sanusi.mahmud@email.com': 40,
    'fauziya.ibrahim@email.com': 41,
    'nasir.mohammed@email.com': 42,
    'balkisa.usman@email.com': 43,
    'malik.yusuf@email.com': 44,
    'saadatu.sani@email.com': 45,
    'zakariya.ahmad@email.com': 46,
    'hanifa.umar@email.com': 47,
    'ibrahim.adamu@email.com': 48,
    'nana.yusuf@email.com': 49,
    'salisu.garba@email.com': 50,
    'hafsa.ali@email.com': 51,
    'ninnys@vendors.com': 52,
    'arewa@vendors.com': 53,
    'suya@vendors.com': 54,
    'kanofood@vendors.com': 55,
    'tuwopalace@vendors.com': 56,
    'mamakhadija@vendors.com': 57,
    'miyanspot@vendors.com': 58,
    'sultans@vendors.com': 59,
    'zainabrice@vendors.com': 60,
    'bakinkasuwa@vendors.com': 61
};

// =====================================================
// VENDOR ID MAPPINGS (vendors table IDs)
// =====================================================
const vendorEmailToVendorId = {
    'ninnys@vendors.com': 1,
    'arewa@vendors.com': 2,
    'suya@vendors.com': 3,
    'kanofood@vendors.com': 4,
    'tuwopalace@vendors.com': 5,
    'mamakhadija@vendors.com': 6,
    'miyanspot@vendors.com': 7,
    'sultans@vendors.com': 8,
    'zainabrice@vendors.com': 9,
    'bakinkasuwa@vendors.com': 10
};

let conversions = 0;

// =====================================================
// PASS 1: Replace parenthesized subqueries with direct IDs
// =====================================================

// Pattern 1: (SELECT id FROM users WHERE email = 'X')
for (const [email, id] of Object.entries(userEmailToId)) {
    const pattern = `(SELECT id FROM users WHERE email = '${email}')`;
    while (sql.includes(pattern)) {
        sql = sql.replace(pattern, id.toString());
        conversions++;
    }
}

// Pattern 2: (SELECT v.id FROM users u JOIN vendors v ON u.id = v.user_id WHERE u.email = 'X')
for (const [email, vendorId] of Object.entries(vendorEmailToVendorId)) {
    const pattern = `(SELECT v.id FROM users u JOIN vendors v ON u.id = v.user_id WHERE u.email = '${email}')`;
    while (sql.includes(pattern)) {
        sql = sql.replace(pattern, vendorId.toString());
        conversions++;
    }
}

// =====================================================
// PASS 2: Convert vendors INSERT...SELECT to VALUES
// =====================================================

for (const [email, userId] of Object.entries(userEmailToId)) {
    if (!vendorEmailToVendorId[email]) continue;

    const fromPattern = `FROM users WHERE email = '${email}';`;

    if (sql.includes(fromPattern)) {
        const fromIndex = sql.indexOf(fromPattern);
        const beforeFrom = sql.substring(0, fromIndex);
        const selectIdIndex = beforeFrom.lastIndexOf('SELECT id,');

        if (selectIdIndex !== -1) {
            const valuesStr = sql.substring(selectIdIndex + 'SELECT id,'.length, fromIndex).trim();
            const oldStatement = sql.substring(selectIdIndex, fromIndex + fromPattern.length);
            const newStatement = `VALUES\n(${userId}, ${valuesStr});`;

            sql = sql.replace(oldStatement, newStatement);
            conversions++;
        }
    }
}

// =====================================================
// PASS 3: Convert vendor_wallets INSERT...SELECT to VALUES
// =====================================================

for (const [email, vendorId] of Object.entries(vendorEmailToVendorId)) {
    const fromPattern = `FROM users u JOIN vendors v ON u.id = v.user_id WHERE u.email = '${email}';`;

    while (sql.includes(fromPattern)) {
        const fromIndex = sql.indexOf(fromPattern);
        const beforeFrom = sql.substring(0, fromIndex);
        const selectVIndex = beforeFrom.lastIndexOf('SELECT v.id,');

        if (selectVIndex !== -1) {
            const valuesStr = sql.substring(selectVIndex + 'SELECT v.id,'.length, fromIndex).trim();
            const oldStatement = sql.substring(selectVIndex, fromIndex + fromPattern.length);
            const newStatement = `VALUES\n(${vendorId}, ${valuesStr});`;

            sql = sql.replace(oldStatement, newStatement);
            conversions++;
        } else {
            break;
        }
    }
}

// =====================================================
// PASS 4: Convert orders with SELECT id, id, values to VALUES (id, id, values)
// =====================================================
// Pattern: SELECT\n    2,\n    1,\n    3000.00, ... ;
// Should be: VALUES (2, 1, 3000.00, ...);

// Fix orders - convert SELECT with IDs to VALUES with proper parentheses
sql = sql.replace(
    /INSERT INTO orders \(([^)]+)\)\s*SELECT\s*\n\s*(\d+),\s*\n\s*(\d+),\s*\n\s*([^;]+);/g,
    (match, cols, custId, vendId, rest) => {
        conversions++;
        return `INSERT INTO orders (${cols})\nVALUES\n(${custId}, ${vendId}, ${rest.trim()});`;
    }
);

// =====================================================
// PASS 5: Convert reviews with SELECT orderId, custId, vendId to VALUES
// =====================================================
sql = sql.replace(
    /INSERT INTO reviews \(([^)]+)\)\s*SELECT (\d+),\s*\n\s*(\d+),\s*\n\s*(\d+),\s*\n?\s*([^;]+);/g,
    (match, cols, orderId, custId, vendId, rest) => {
        conversions++;
        return `INSERT INTO reviews (${cols})\nVALUES\n(${orderId}, ${custId}, ${vendId}, ${rest.trim()});`;
    }
);

// =====================================================
// PASS 6: Remove USE statement (not needed for Aiven)
// =====================================================
sql = sql.replace(/USE localconnect_db;\s*/g, '-- USE statement removed for Aiven compatibility\n');

// =====================================================
// PASS 7: Update header comment
// =====================================================
sql = sql.replace(
    '-- LocalConnect Comprehensive Seed Data - CORRECTED v2',
    '-- LocalConnect Seed Data - AIVEN COMPATIBLE VERSION\n-- Auto-generated by convert-seed-to-aiven.js\n-- Original: seed_data.sql'
);

// Write the converted file
fs.writeFileSync(outputFile, sql, 'utf8');

// Summary
console.log('✅ Conversion complete!');
console.log('');
console.log('📊 Total conversions: ' + conversions);
console.log('');
console.log('📁 Output file: database/seed_data_aiven.sql');
console.log('');
console.log('💡 Next steps:');
console.log('   1. Run: npm run setup-db');
console.log('');
