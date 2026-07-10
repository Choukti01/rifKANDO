import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, UserIcon, PhoneIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import VerificationModal from '../../components/auth/VerificationModal';
import toast from 'react-hot-toast';
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from '../../contexts/AuthContext';

const RegisterPage = () => {

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [showVerification, setShowVerification] = useState(false);
  const [tempUserData, setTempUserData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const { googleLogin } = useAuth();



  const handleChange = (e) => {

    const {name,value,type,checked} = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));


    if(errors[name]){

      setErrors(prev => ({
        ...prev,
        [name]:''
      }));

    }

  };





  const validateForm = () => {

    const newErrors = {};


    if(!formData.name)
      newErrors.name = "Full name is required";


    if(!formData.email)
      newErrors.email = "Email is required";


    else if(!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";



    if(!formData.phone)
      newErrors.phone = "Phone number is required";


    else if(!/^[0-9]{10}$/.test(formData.phone))
      newErrors.phone = "Enter a valid 10-digit phone number";



    if(!formData.password)
      newErrors.password = "Password is required";


    else if(formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";



    if(formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";



    if(!formData.agreeTerms)
      newErrors.agreeTerms = "You must agree to the terms";



    setErrors(newErrors);


    return Object.keys(newErrors).length === 0;

  };







  // REGISTER -> SEND EMAIL CODE

  const sendVerificationCode = async() => {

    setIsLoading(true);


    try {


      await api.post('/auth/register', {

        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password

      });



      setTempUserData({

        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password

      });



      toast.success(
        "Verification code sent to your email!"
      );


      setShowVerification(true);



    } catch(error){


      console.error(
        "Register error:",
        error.response?.data
      );


      toast.error(

        error.response?.data?.message ||
        error.response?.data?.error ||
        "Registration failed"

      );



    } finally {


      setIsLoading(false);

    }


  };









  // VERIFY EMAIL

  const handleVerify = async(code) => {


    try {


      const response = await api.post(
        '/auth/verify-email',
        {

          email: tempUserData.email,
          code

        }
      );



      if(response.data.status === "success"){


        localStorage.setItem(
          "token",
          response.data.token
        );


        localStorage.setItem(
          "user",
          JSON.stringify(
            response.data.data.user
          )
        );



        toast.success(
          "Registration successful!"
        );


        navigate('/');

      }



    } catch(error){


      toast.error(

        error.response?.data?.message ||
        error.response?.data?.error ||
        "Invalid verification code"

      );


    }

  };








  const handleResendCode = async()=>{

    toast(
      "Resend verification will be added soon"
    );

  };

















  const handleGoogleSuccess = async (credentialResponse) => {

  try {

    const result = await googleLogin(credentialResponse.credential);

    if (result.success) {
      navigate("/");
    }

  } catch (error) {

    console.error(error);

    toast.error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Google Sign In failed"
    );

  }

};







  const handleSubmit = async(e)=>{

    e.preventDefault();


    if(!validateForm())
      return;


    await sendVerificationCode();


  };





return (

<>


<div className="register-page">

<div className="container">

<div className="register-card">


<div className="register-header">

<h1>Create Account</h1>

<p className="text-gray">
Join rifKANDO today
</p>


</div>











<form onSubmit={handleSubmit}>


<div className="form-group">

<label className="form-label">
Full Name
</label>


<div className="input-icon-wrapper">

<UserIcon className="input-icon"/>


<input

type="text"

name="name"

value={formData.name}

onChange={handleChange}

placeholder="Ahmed Benjelloun"

className={`form-input ${errors.name ? 'error':''}`}

/>


</div>


{errors.name &&
<span className="form-error">
{errors.name}
</span>}


</div>






<div className="form-group">

<label className="form-label">
Email Address
</label>


<div className="input-icon-wrapper">

<EnvelopeIcon className="input-icon"/>


<input

type="email"

name="email"

value={formData.email}

onChange={handleChange}

placeholder="you@example.com"

className={`form-input ${errors.email?'error':''}`}

/>


</div>


{errors.email &&
<span className="form-error">
{errors.email}
</span>}


</div>






<div className="form-group">

<label className="form-label">
Phone Number
</label>


<div className="input-icon-wrapper">

<PhoneIcon className="input-icon"/>


<input

type="tel"

name="phone"

value={formData.phone}

onChange={handleChange}

placeholder="0612345678"

className={`form-input ${errors.phone?'error':''}`}

/>


</div>


{errors.phone &&
<span className="form-error">
{errors.phone}
</span>}


</div>






<div className="form-group">

<label className="form-label">
Password
</label>


<div className="input-icon-wrapper">

<LockClosedIcon className="input-icon"/>


<input

type={showPassword?'text':'password'}

name="password"

value={formData.password}

onChange={handleChange}

className={`form-input ${errors.password?'error':''}`}

/>


<button

type="button"

onClick={()=>setShowPassword(!showPassword)}

className="password-toggle"

>

{
showPassword ?

<EyeSlashIcon className="w-5 h-5"/>

:

<EyeIcon className="w-5 h-5"/>

}

</button>


</div>


</div>







<div className="form-group">

<label className="form-label">
Confirm Password
</label>


<div className="input-icon-wrapper">

<LockClosedIcon className="input-icon"/>


<input

type={showConfirmPassword?'text':'password'}

name="confirmPassword"

value={formData.confirmPassword}

onChange={handleChange}

className={`form-input ${errors.confirmPassword?'error':''}`}

/>


</div>


</div>







<div className="form-group">


<label className="flex items-center gap-2 cursor-pointer">


<input

type="checkbox"

name="agreeTerms"

checked={formData.agreeTerms}

onChange={handleChange}

/>


<span>

I agree to the Terms of Service and Privacy Policy

</span>


</label>


</div>






<button

disabled={isLoading}

className="btn btn-primary w-full"

>

{
isLoading

?

"Sending Code..."

:

"Sign Up"

}


</button>








<div
  style={{
    marginTop: "20px",
    textAlign: "center"
  }}
>

  <p
    style={{
      color: "#777",
      marginBottom: "15px"
    }}
  >
    Or continue with
  </p>

  <GoogleLogin
    onSuccess={handleGoogleSuccess}
    onError={() => toast.error("Google Login Failed")}
    theme="outline"
    size="large"
    width={320}
  />

</div>








</form>







<div className="text-center mt-6">


<p className="text-sm text-gray">

Already have an account?


<Link to="/login" className="text-primary font-medium">

 Sign in

</Link>


</p>


</div>



</div>


</div>


</div>









{
showVerification &&

<VerificationModal

email={tempUserData?.email}

name={tempUserData?.name}

onVerify={handleVerify}

onClose={()=>setShowVerification(false)}

onResend={handleResendCode}

/>

}







<style>{`

.register-page {

min-height: calc(100vh - 80px);

display:flex;

align-items:center;

justify-content:center;

padding:2rem;

background:linear-gradient(
135deg,
rgba(135,206,235,0.05) 0%,
#ffffff 100%
);

}



.register-card {

max-width:500px;

width:100%;

background:white;

border-radius:1.5rem;

box-shadow:0 20px 35px -10px rgba(0,0,0,0.1);

padding:2rem;

}



.register-header {

text-align:center;

margin-bottom:2rem;

}



.register-header h1 {

font-size:1.75rem;

margin-bottom:0.5rem;

}



.input-icon-wrapper {

position:relative;

}



.input-icon {

position:absolute;

left:1rem;

top:50%;

transform:translateY(-50%);

width:1.25rem;

height:1.25rem;

color:#9ca3af;

}



.input-icon-wrapper input {

padding-left:2.75rem;

padding-right:2.75rem;

}



.password-toggle {

position:absolute;

right:1rem;

top:50%;

transform:translateY(-50%);

background:none;

border:none;

cursor:pointer;

color:#9ca3af;

}



.form-input.error {

border-color:#ef4444;

}



.alert-error {

background:#fee2e2;

color:#dc2626;

padding:0.75rem;

border-radius:0.75rem;

margin-bottom:1.5rem;

font-size:0.875rem;

text-align:center;

}


`}</style>


</>

);


};


export default RegisterPage;
