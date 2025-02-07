import Lead from "../models/leadModel.js";
import { sendInitialMessage } from '../jobs/slicktext/contactManagement.js';

export const addNewLeadSlickText = async (req, res) => {
  try {
    const { 
      phoneNumber,
      source,
      buyer,
      fullName,
      email,
      zipcode,
      income,
      address,
      gender,
      familySize,
      age,
      preExisting
    } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Send initial message and get contact_id
    const contactId = await sendInitialMessage(normalizedPhone);
    
    // Create lead in our database
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
      // Validate gender if provided
      let normalizedGender = null;
      if (gender) {
        const lowerGender = gender.toLowerCase();
        if (!['male', 'female', 'other'].includes(lowerGender)) {
          return res.status(400).json({
            success: false,
            message: "Invalid gender value. Must be 'male', 'female', or 'other'"
          });
        }
        normalizedGender = lowerGender;
      }

      lead = new Lead({ 
        phoneNumber: normalizedPhone,
        slickTextContactId: contactId,
        source: source || null,
        buyer: buyer || null,
        fullName: fullName || null,
        email: email || null,
        zipcode: zipcode || null,
        income: income ? Number(income) || null : null,
        address: address || null,
        gender: normalizedGender,
        familySize: familySize ? Number(familySize) || null : null,
        age: age ? Number(age) || null : null,
        preExisting: preExisting === undefined ? null : Boolean(preExisting)
      });
      await lead.save();
    }
    else {
      if (lead.slickTextContactId != contactId) {
        lead.slickTextContactId = contactId;
        console.log("Updated slickTextContactId for lead:", lead);
        await lead.save();
      }
    }

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

export const createLead = async (req, res) => {
  try {
    const {
      phoneNumber,
      source,
      buyer,
      fullName,
      email,
      zipcode,
      income,
      address,
      gender,
      familySize,
      age,
      preExisting,
      slickTextContactId
    } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    
    if (lead) {
      return res.status(409).json({
        success: false,
        message: "Lead with this phone number already exists",
        data: lead
      });
    }

    // Validate gender if provided
    let normalizedGender = null;
    if (gender) {
      const lowerGender = gender.toLowerCase();
      if (!['male', 'female', 'other'].includes(lowerGender)) {
        return res.status(400).json({
          success: false,
          message: "Invalid gender value. Must be 'male', 'female', or 'other'"
        });
      }
      normalizedGender = lowerGender;
    }

    lead = new Lead({
      phoneNumber: normalizedPhone,
      source: source || null,
      buyer: buyer || null,
      date: new Date(), // Auto-generate current date
      fullName: fullName || null,
      email: email || null,
      zipcode: zipcode || null,
      income: income ? Number(income) || null : null,
      address: address || null,
      gender: normalizedGender,
      familySize: familySize ? Number(familySize) || null : null,
      age: age ? Number(age) || null : null,
      preExisting: preExisting === undefined ? null : Boolean(preExisting),
      slickTextContactId: slickTextContactId || null
    });

    await lead.save();

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead
    });

  } catch (error) {
    console.error("Error in createLead:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
