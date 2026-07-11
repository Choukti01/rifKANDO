const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);


exports.sendVerificationEmail = async (email, code) => {

  await resend.emails.send({

    from: process.env.EMAIL_FROM,

    to: email,

    subject: "Verify your RifKANDO account",

    html: `
      <h2>Welcome to RifKANDO</h2>

      <p>Your verification code is:</p>

      <h1>${code}</h1>

      <p>This code expires in 10 minutes.</p>
    `
  });

};

exports.sendWelcomeEmail = async (email, name) => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to RifKANDO',
    html: `<h2>Welcome, ${name}!</h2><p>Your RifKANDO account is verified and ready to use.</p>`
  });
};

exports.sendLoginNotificationEmail = async (email, name) => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'New sign-in to your RifKANDO account',
    html: `<p>Hello ${name},</p><p>We noticed a successful sign-in to your RifKANDO account.</p><p>If this was not you, contact support immediately.</p>`
  });
};





// const { Resend } = require('resend');

// const resend = new Resend(process.env.RESEND_API_KEY);


// exports.sendVerificationEmail = async (email, code) => {

//   try {

//     console.log("Sending verification email...");
//     console.log("TO:", email);
//     console.log("FROM:", process.env.EMAIL_FROM);


//     const response = await resend.emails.send({

//       from: process.env.EMAIL_FROM,

//       to: email,

//       subject: "Verify your RifKANDO account",

//       html: `
//         <h2>Welcome to RifKANDO</h2>

//         <p>Your verification code is:</p>

//         <h1>${code}</h1>

//         <p>This code expires in 10 minutes.</p>
//       `

//     });


//     console.log("RESEND RESPONSE:", response);


//     return response;


//   } catch(error){


//     console.error(
//       "RESEND EMAIL ERROR:",
//       error
//     );


//     throw error;

//   }

// };
