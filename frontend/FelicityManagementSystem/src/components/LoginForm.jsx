import { use, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import Input from './Input';
import PasswordInputBox from './PasswordInputBox';
import Button from './Button';
import CheckBox from './CheckBox';
import { loginUser } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../contexts/UserContexts';
import { getUserData } from '../services/user';
import logo from '../assets/Felicity_Logo_Light.png'

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const navigate = useNavigate()
    const { updateUserData } = useContext(UserContext)
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));


        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };



    const validateForm = () => {
        const newErrors = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (validateForm()) {
            formData.role = "Participant"

            await loginUser(formData)
                .then(async (r) => {
                    // Fetch and update user data before navigating
                    const userDataResponse = await getUserData()
                    if (userDataResponse.data.response) {
                        updateUserData(userDataResponse.data.response)
                    }
                    if (userDataResponse.data.response.role === 'Organizer') {
                        navigate('/organizer-dashboard')
                    } else if (userDataResponse.data.response.role === 'Participant') {
                        navigate('/participant-dashboard')
                    } else if (userDataResponse.data.response.role === 'Admin') {
                        navigate('/admin-dashboard')
                    }
                }).catch((err) => {
                    setErrors((prev) => {
                        return { ...prev, backendError: err.response?.data?.error }
                    })
                })
        }
    };

    return (
        <div className='flex justify-center items-center w-full h-full px-4'>
            <form onSubmit={handleSubmit} className="w-full max-w-md lg:max-w-lg bg-stone-800 drop-shadow-stone-950 drop-shadow-xl justify-center items-center rounded-2xl">
                <div className='flex justify-center items-center'>
                    <img
                        src={logo}
                        className="w-60 h-25 mt-8"
                    />
                </div>
                <div className="mb-6">
                    <p className="text-white text-3xl mt-5 ml-8">Login</p>
                </div>

                {/* Email */}
                <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                    error={errors.email}
                    containerClass='m-8'
                    className='placeholder:text-gray-500 text-lg text-white'
                    iconShow={true}
                    iconSVG='
                        <svg xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth="1.5" 
                                stroke="currentColor" 
                                className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" 
                                d="M21.75 7.5v9a2.25 2.25 0 01-2.25 
                                2.25H4.5A2.25 2.25 0 012.25 16.5v-9m19.5 
                                0l-9.75 6.75L2.25 7.5m19.5 0A2.25 2.25 0 0019.5 
                                5.25H4.5A2.25 2.25 0 002.25 7.5" />
                        </svg>
                    '
                />

                {/* Password */}
                <PasswordInputBox
                    label="Password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    error={errors.password}
                    containerClass='m-8'
                    className='placeholder:text-gray-500 text-lg text-white'
                    iconShow={true}
                    iconSVG='<svg xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round"
                                d="M16 10V7a4 4 0 10-8 0v3M5 10h14v9H5z" />
                        </svg>'
                />

                {/*Forgot Password */}
                <div className="flex items-center justify-between mb-6 m-8 mt-0">
                    <Button
                        isbaseStyles={false}
                        className="text-sm text-orange-300 hover:text-orange-500 font-medium"
                        variant="custom"

                    >
                        Forgot password?
                    </Button>
                </div>

                {/* Submit Button */}
                <div className='m-8'>
                    {errors.backendError && (
                        <p className="mt-1 text-sm text-red-600 justify-center items-center flex mb-1">{errors.backendError}</p>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        className='w-full h-10'
                        isbaseStyles={false}
                    >
                        Log In
                    </Button>
                </div>
                {/* Signup Link */}
                <p className="text-center text-sm text-gray-400 mt-4 mb-15">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-orange-300 hover:text-orange-500 font-medium">
                        Sign up
                    </Link>
                </p>
            </form>
        </div>
    );
};

export default LoginForm;
