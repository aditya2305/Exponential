import Lead from "../models/leadModel.js";
import { sendInitialMessage, findExistingContact } from '../jobs/slicktext/contactManagement.js';
import { sendSlickTextMessage } from '../jobs/slicktext/sendSlickTextMessage.js';
import { getStateFromZipCode } from '../config/index.js';

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
    // let messageText = fullName 
    //   ? `Hi ${fullName.split(' ')[0]}, this is Julie.` 
    //   : "Hi, this is Julie.";
    
    // messageText += " Thank you for your application for health coverage.\n\n";
    
    // if (zipcode) {
    //   const state = getStateFromZipCode(zipcode);
    //   if (state) {
    //     messageText += `I've just pulled up the top 2025 ${state} rates in your area.`;
    //   } else {
    //     messageText += `I've just pulled up the top 2025 rates in your area.`;
    //   }
    // } else {
    //   messageText += `Have your best 2025 rates pulled up and ready.`;
    // }
    
    // messageText += "\n\nWorth a look? Press STOP to end";

    let messageText = fullName 
      ? `Thank you for your interest in health insurance ${fullName.split(' ')[0]}! How can I assist you today? STOP to end`
      : "Thank you for your interest in health insurance! How can I assist you today? STOP to end";

    if (existingContact) {
      contactId = existingContact.contact_id;
      await sendSlickTextMessage(contactId, messageText);
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
      }, messageText);
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
      buyer,
      messages: [{
        role: "assistant",
        content: messageText,
        approved: true,
        processed: true
      }]
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
