import Lead from "../models/leadModel.js";
import { sendSlickTextMessage } from "../jobs/slicktext/sendSlickTextMessage.js";

export const addNewLeadSlickText = async (req, res) => {
  try {
    const { phoneNumber, textword } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing phoneNumber" 
      });
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
      lead = new Lead({ phoneNumber: normalizedPhone });
      await lead.save();
    }

    await sendSlickTextMessage(
      normalizedPhone,
      "Thank you for your application for health insurance, are you looking for yourself or the family today? Reply STOP to end."
    );

    return res.json({ 
      success: true, 
      message: "Lead added & first SMS sent." 
    });
  } catch (error) {
    console.error("Error in addNewLeadSlickText:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal error" 
    });
  }
};

export const createLead = async (req, res) => {
  try {
    const {
      phoneNumber,
      source,
      buyer,
      date,
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

    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    
    if (lead) {
      return res.status(409).json({
        success: false,
        message: "Lead with this phone number already exists",
        data: lead
      });
    }

    // Validate date if provided
    let parsedDate = null;
    if (date) {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format"
        });
      }
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
      date: parsedDate,
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
