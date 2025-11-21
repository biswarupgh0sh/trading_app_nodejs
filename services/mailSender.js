import otpGenerator from 'otp-generator';
import nodemailer from 'nodemailer';
import fs from 'fs';
import inlineCss from 'inline-css';


export const mailSender = async (email, otp, otp_type) => {


    let htmlContent = fs.readFileSync('../otp_template.html', 'utf-8');
    htmlContent = htmlContent.replace('tradevault_otp', otp);
    htmlContent = htmlContent.replace('tradevault_otp2', otp_type);


    const options = {
        url: '',
    }

    htmlContent = await inlineCss(htmlContent, options);


    try {
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        const result =await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: email,
            subject: "This is the OTP for your trading app",
            html: htmlContent
        });

        return result;
    } catch (error) {
        console.log(error);
        throw error;
    }
}



export const otpGenerator = () => {
    return otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCasealphabets: false});
}