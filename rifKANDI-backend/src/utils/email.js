const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);


const sendVerificationEmail = async(email, token)=>{

    const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;


    await resend.emails.send({

        from: "RifKANDO <onboarding@resend.dev>",

        to: email,

        subject: "Verify your RifKANDO account",

        html: `

        <h2>Welcome to RifKANDO 🚀</h2>

        <p>
        Click the button below to verify your email.
        </p>


        <a href="${link}"
        style="
        background:#87CEEB;
        padding:12px 20px;
        border-radius:8px;
        color:black;
        text-decoration:none;
        ">

        Verify Email

        </a>

        `

    })

}


module.exports = sendVerificationEmail;