import { parse } from 'csv-parse/sync';
import Lead from '../../models/leadModel.js';

const normalizeHeader = (header) => {
  // Remove spaces, special chars and convert to lowercase
  return header.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

const findColumnIndex = (headers, possibleNames) => {
  const normalizedHeaders = headers.map(normalizeHeader);
  return normalizedHeaders.findIndex(header => 
    possibleNames.some(name => normalizeHeader(name) === header)
  );
};

export const processLeadsCsv = async (csvData) => {
  try {
    // Parse CSV with options
    const records = parse(csvData, {
      skip_empty_lines: true,
      trim: true,
      skip_records_with_empty_values: true,
      relax_column_count: true,
      columns: false
    });

    if (records.length < 2) { // At least header + 1 record
      throw new Error("CSV file is empty or has no data rows");
    }

    const headers = records[0];

    // Find column indices using various possible names
    const nameIdx = findColumnIndex(headers, ['name', 'fullname', 'full name', 'customer name']);
    const phoneIdx = findColumnIndex(headers, ['phone', 'phonenumber', 'phone number', 'mobile', 'contact']);
    const zipIdx = findColumnIndex(headers, ['zip', 'zipcode', 'postal code', 'zip code']);

    if (nameIdx === -1 || phoneIdx === -1 || zipIdx === -1) {
      throw new Error("Required columns not found in CSV. Need name, phone number, and zipcode columns.");
    }

    const leads = [];
    
    // Start from 1 to skip header
    for (let i = 1; i < records.length; i++) {
      const record = records[i];
      
      // Skip empty rows or rows with insufficient data
      if (!record || record.length < Math.max(nameIdx, phoneIdx, zipIdx) + 1) {
        console.warn(`Skipping row ${i + 1}: insufficient data`);
        continue;
      }

      const name = record[nameIdx].trim();
      const phoneNumber = record[phoneIdx].trim();
      const zipcode = record[zipIdx].trim();

      // Basic validation
      if (!name || !phoneNumber) {
        console.warn(`Skipping row ${i + 1}: missing required fields`);
        continue;
      }

      // Validate and normalize phone number
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        console.warn(`Skipping row ${i + 1}: invalid phone number`);
        continue;
      }
      
      // Take last 10 digits
      const normalizedPhone = digitsOnly.slice(-10);
      
      // Check for existing lead
      const existingLead = await Lead.findOne({ phoneNumber: normalizedPhone });
      if (existingLead) {
        console.warn(`Skipping row ${i + 1}: lead already exists`);
        continue;
      }

      const lead = new Lead({
        phoneNumber: normalizedPhone,
        fullName: name,
        zipcode,
        aged: true
      });
      
      await lead.save();
      leads.push(lead);
    }
    
    return leads;
  } catch (error) {
    console.error('Error processing CSV:', error);
    throw error;
  }
}; 