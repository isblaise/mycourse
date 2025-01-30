const nodemailer = require('nodemailer');
const cors = require('cors');
const express = require('express');
const app = express();

app.use(express.json());
app.use(cors());  


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "isblaise00@gmail.com",
      pass: "nykegrpfowipvlvs",
    },
  });
  

 exports.SendEmail = async (req, res) => {
    try {
      const { to, subject, message } = req.body;
  
      const info = await transporter.sendMail({
        from: 'mycourses@qlluscom.com',
        to: to,
        subject: subject,
        text: message,
        html: `<p>${message}</p>`,
      });
  
      console.log("Message sent: %s", info.messageId);
      res.json({ success: true, messageId: info.messageId });
  
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };