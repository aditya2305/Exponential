import Lead from "../models/leadModel.js";
import { sendInitialMessage, findExistingContact } from '../jobs/slicktext/contactManagement.js';
import { sendSlickTextMessage } from '../jobs/slicktext/sendSlickTextMessage.js';

export const addNewLeadSlickText = async (req, res) => {
  try {
    const { 
      phoneNumber,
      telegramUserId,
      username,
      fullName = null,
      email = null,
      zipcode = null,
      income = null,
      address = null,
      gender = null,
      familySize = null,
      age = null,
      preExisting = null,
      source = null,
      buyer = null
    } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be at least 10 digits"
      });
    }
    
    const normalizedPhone = digitsOnly.slice(-10);
    
    // Check if lead already exists in our database
    const existingLead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (existingLead) {
      return res.status(400).json({
        success: false,
        message: "Lead with this phone number already exists"
      });
    }

    // Check if contact exists in SlickText
    const existingContact = await findExistingContact(normalizedPhone);

    let contactId;
    if (existingContact) {
      contactId = existingContact.contact_id;
      await sendSlickTextMessage(contactId, "Hi, this is Julie. Thank you for your application for health coverage.\n\nWas looping back and found some really great rates for 2025.\n\nWorth a look?\nPress STOP to end");
    } else {
      contactId = await sendInitialMessage(normalizedPhone, {
        fullName,
        email,
        zipcode,
        income,
        address,
        gender,
        familySize,
        age,
        preExisting,
        source,
        buyer
      });
    }
    
    // Create lead in our database
    let lead = new Lead({ 
      phoneNumber: normalizedPhone,
      telegramUserId,
      username,
      fullName,
      email,
      zipcode,
      income: income ? Number(income) || null : null,
      address,
      gender,
      familySize: familySize ? Number(familySize) || null : null,
      age: age ? Number(age) || null : null,
      preExisting: preExisting === undefined ? null : Boolean(preExisting),
      slickTextContactId: contactId,
      source,
      buyer
    });
    await lead.save();

    res.status(200).json({ 
      success: true, 
      message: "Lead created and initial message sent",
      data: lead
    });

  } catch (error) {
    console.error("Error in addNewLeadSlickText:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
