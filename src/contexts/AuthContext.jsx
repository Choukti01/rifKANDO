import React, { createContext, useContext, useState, useEffect } from 'react';
import { register as registerApi, login as loginApi, getMe } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};


export const AuthProvider = ({ children }) => {


  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [token, setToken] = useState(
    localStorage.getItem('token')
  );




  useEffect(() => {

    if(token){

      api.defaults.headers.common['Authorization'] =
      `Bearer ${token}`;

      fetchUser();

    }else{

      delete api.defaults.headers.common['Authorization'];

      setLoading(false);

    }

  }, [token]);





  const fetchUser = async () => {

    try {


      const response = await getMe();


      const userData =
      response.data.data?.user ||
      response.data.user;



      const normalizedUser = {

        ...userData,

        sellerType:
        userData.sellerType ||
        userData.seller_type ||
        null

      };



      setUser(normalizedUser);


      localStorage.setItem(
        'user',
        JSON.stringify(normalizedUser)
      );



    } catch(error){


      console.error(
        'Failed to fetch user:',
        error
      );


      localStorage.removeItem('token');

      localStorage.removeItem('user');


      setToken(null);



    } finally {


      setLoading(false);


    }

  };







  const login = async (email,password)=>{


    try{


      const response =
      await loginApi({
        email,
        password
      });



      const token =
      response.data.token;



      const user =
      response.data.user ||
      response.data.data?.user;



      const normalizedUser = {

        ...user,

        sellerType:
        user.sellerType ||
        user.seller_type ||
        null

      };



      localStorage.setItem(
        'token',
        token
      );


      localStorage.setItem(
        'user',
        JSON.stringify(normalizedUser)
      );



      setToken(token);


      setUser(normalizedUser);



      toast.success(
        'Login successful!'
      );



      return {

        success:true,

        user:normalizedUser

      };



    }catch(error){


      toast.error(
        error.response?.data?.error ||
        'Login failed'
      );


      return {

        success:false

      };

    }

  };









  // ===============================
  // REGISTER WITH EMAIL VERIFICATION
  // ===============================


  const register = async(userData)=>{


    try{


      const response =
      await registerApi(userData);




      if(response.data.status === "success"){


        toast.success(

          response.data.message ||
          "Verification code sent to your email"

        );



        return {


          success:true,


          verificationRequired:true


        };


      }



      return {

        success:false

      };



    }catch(error){



      console.error(

        "Registration error:",
        error.response?.data

      );



      toast.error(

        error.response?.data?.message ||

        error.response?.data?.error ||

        "Registration failed"

      );



      return {


        success:false


      };


    }


  };









  const logout = ()=>{


    localStorage.removeItem('token');

    localStorage.removeItem('user');


    setToken(null);

    setUser(null);



    toast.success(
      'Logged out successfully'
    );


  };









  const updateUser = (updatedUser)=>{


    const normalized = {


      ...updatedUser,


      sellerType:

      updatedUser.sellerType ||

      updatedUser.seller_type ||

      null


    };



    setUser(normalized);


    localStorage.setItem(

      'user',

      JSON.stringify(normalized)

    );


  };









  const updateSellerType = async(sellerType)=>{


    try{


      const response =
      await api.patch(
        '/users/update-seller-type',
        {
          sellerType
        }
      );



      if(response.data.success){


        const updatedUser =
        response.data.data.user;



        const normalized = {


          ...updatedUser,


          sellerType:

          updatedUser.sellerType ||

          updatedUser.seller_type ||

          sellerType


        };



        setUser(normalized);



        localStorage.setItem(

          'user',

          JSON.stringify(normalized)

        );



        toast.success(
          `You are now a ${sellerType} seller!`
        );



        return {


          success:true,

          user:normalized


        };



      }else{


        toast.error(
          'Failed to update seller type'
        );


        return {


          success:false


        };


      }



    }catch(error){



      console.error(

        'Update seller type error:',
        error

      );



      toast.error(

        error.response?.data?.error ||

        'Server error'

      );



      return {


        success:false


      };


    }


  };









  const value = {


    user,

    loading,

    token,


    isAuthenticated:!!user,


    login,


    register,


    logout,


    updateUser,


    updateSellerType


  };







  return (

    <AuthContext.Provider value={value}>

      {children}

    </AuthContext.Provider>

  );


};


