// final-converter.js - Comprehensive Aiven-compatible seed data converter
// Converts all subqueries to direct IDs based on insertion order

const fs = require('fs');

console.log('🔄 Final conversion of seed_data.sql to Aiven-compatible format...');
console.log('');

let sql = fs.readFileSync('./database/seed_data.sql', 'utf8');

// =====================================================
// EMAIL TO ID MAPPINGS (based on actual insertion order)
// =====================================================

const userEmails = {
    // Admin (ID 1)
    'admin@localconnect.com': 1,

    // Test customers (IDs 2-6)
    'customer1@test.com': 2,
    'customer2@test.com': 3,
    'customer3@test.com': 4,
    'customer4@test.com': 5,
    'customer5@test.com': 6,

    // Additional 45 customers (IDs 7-51) - EXACT order from seed_data.sql
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

    // Vendor users (IDs 52-61)
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

const vendorEmails = {
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
// STEP 1: Replace USE statement
// =====================================================
console.log('📝 Step 1: Updating database reference...');
sql = sql.replace(/USE localconnect_db;/g, '-- Database selected by connection');
conversions++;

// =====================================================
// STEP 2: Replace all (SELECT id FROM users WHERE email = 'X') patterns
// =====================================================
console.log('📝 Step 2: Converting user ID subqueries...');
for (const [email, id] of Object.entries(userEmails)) {
    const pattern = `(SELECT id FROM users WHERE email = '${email}')`;
    let count = 0;
    while (sql.includes(pattern)) {
        sql = sql.replace(pattern, id.toString());
        count++;
        conversions++;
    }
    if (count > 0) {
        console.log(`   ✓ ${email} → ${id} (${count} replacements)`);
    }
}

// =====================================================
// STEP 3: Replace all (SELECT v.id FROM users u JOIN vendors v...) patterns
// =====================================================
console.log('📝 Step 3: Converting vendor ID subqueries...');
for (const [email, vendorId] of Object.entries(vendorEmails)) {
    const pattern = `(SELECT v.id FROM users u JOIN vendors v ON u.id = v.user_id WHERE u.email = '${email}')`;
    let count = 0;
    while (sql.includes(pattern)) {
        sql = sql.replace(pattern, vendorId.toString());
        count++;
        conversions++;
    }
    if (count > 0) {
        console.log(`   ✓ ${email} → vendor ${vendorId} (${count} replacements)`);
    }
}

// =====================================================
// STEP 4: Convert vendors INSERT...SELECT to INSERT...VALUES
// =====================================================
console.log('📝 Step 4: Converting vendor INSERT statements...');
for (const [email, userId] of Object.entries(userEmails)) {
    if (!vendorEmails[email]) continue;

    const fromPattern = `FROM users WHERE email = '${email}';`;

    while (sql.includes(fromPattern)) {
        const fromIndex = sql.indexOf(fromPattern);
        const beforeFrom = sql.substring(0, fromIndex);
        const selectIdIndex = beforeFrom.lastIndexOf('SELECT id,');

        if (selectIdIndex !== -1) {
            const valuesStr = sql.substring(selectIdIndex + 'SELECT id,'.length, fromIndex).trim();
            const oldStatement = sql.substring(selectIdIndex, fromIndex + fromPattern.length);
            const newStatement = `VALUES\n(${userId}, ${valuesStr});`;

            sql = sql.replace(oldStatement, newStatement);
            conversions++;
            console.log(`   ✓ Vendor ${email} → user_id ${userId}`);
        } else {
            break;
        }
    }
}

// =====================================================
// STEP 5: Convert vendor_wallets INSERT...SELECT to INSERT...VALUES
// =====================================================
console.log('📝 Step 5: Converting vendor_wallets INSERT statements...');
for (const [email, vendorId] of Object.entries(vendorEmails)) {
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
            console.log(`   ✓ Vendor wallet for ${email} → vendor_id ${vendorId}`);
        } else {
            break;
        }
    }
}

// =====================================================
// STEP 6: Convert orders SELECT...to VALUES
// =====================================================
console.log('📝 Step 6: Converting order INSERT statements...');

// Pattern: INSERT INTO orders (...) SELECT\n    custId,\n    vendId,\n    rest;
// Convert to: INSERT INTO orders (...) VALUES\n(custId, vendId, rest);
sql = sql.replace(
    /INSERT INTO orders \(([^)]+)\)\s*SELECT\s*\n\s*(\d+),\s*\n\s*(\d+),\s*\n\s*([^;]+);/g,
    (match, cols, custId, vendId, rest) => {
        conversions++;
        return `INSERT INTO orders (${cols})\nVALUES\n(${custId}, ${vendId}, ${rest.trim()});`;
    }
);
console.log('   ✓ Orders converted to VALUES syntax');

// =====================================================
// STEP 7: Convert reviews SELECT...to VALUES
// =====================================================
console.log('📝 Step 7: Converting review INSERT statements...');

// Pattern: INSERT INTO reviews (...) SELECT orderId,\n    custId,\n    vendId,\n    rest;
sql = sql.replace(
    /INSERT INTO reviews \(([^)]+)\)\s*SELECT (\d+),\s*\n\s*(\d+),\s*\n\s*(\d+),\s*\n?\s*([^;]+);/g,
    (match, cols, orderId, custId, vendId, rest) => {
        conversions++;
        return `INSERT INTO reviews (${cols})\nVALUES\n(${orderId}, ${custId}, ${vendId}, ${rest.trim()});`;
    }
);
console.log('   ✓ Reviews converted to VALUES syntax');

// =====================================================
// STEP 8: Update header comment
// =====================================================
sql = sql.replace(
    '-- LocalConnect Comprehensive Seed Data - CORRECTED v2',
    '-- LocalConnect Seed Data - AIVEN MYSQL COMPATIBLE\n-- Auto-generated by final-converter.js\n-- All subqueries converted to direct IDs'
);

// =====================================================
// Write final file
// =====================================================
const outputFile = './database/seed_aiven_final.sql';
fs.writeFileSync(outputFile, sql, 'utf8');

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('✅ Conversion complete!');
console.log('═══════════════════════════════════════════════');
console.log(`📊 Total conversions: ${conversions}`);
console.log(`📁 Output file: ${outputFile}`);
console.log('');
console.log('📋 ID Mapping Summary:');
console.log('   • Users: 1-61 (admin, 50 customers, 10 vendors)');
console.log('   • Vendors: 1-10 (linked to user_ids 52-61)');
console.log('   • Test accounts: customer1-5@test.com (IDs 2-6)');
console.log('');
console.log('🎉 Ready to deploy to Aiven MySQL!');
console.log('   Run: npm run setup-db');
console.log('');
