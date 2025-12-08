import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const Login = () => {
    const { register, handleSubmit, handleLogin, errors, loadingFlags } = useAuth();
    const [showLogin, setShowLogin] = useState(false);

    return (
        <div className="h-full flex flex-col lg:flex-row justify-center items-center gap-0 overflow-hidden relative">
            {/* Left Side - Logo and Visuals */}
            <div className={`h-full flex flex-col justify-center items-center gap-6 text-center bg-white absolute left-0 top-0 transition-all duration-1000 ease-in-out overflow-hidden ${showLogin ? 'w-full lg:w-1/2 -translate-x-full lg:translate-x-0' : 'w-full translate-x-0'}`}>
                <div className="w-full h-full flex flex-col justify-center items-center gap-6 text-center p-8 relative z-0">
                    {/* Growing Plants GIF at Bottom - Inside White Container */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end pointer-events-none z-10 overflow-visible">
                        <img 
                            src={`${import.meta.env.BASE_URL}flowers.gif`}
                            alt="Growing Plants Animation" 
                            className="h-[120%] w-auto object-cover opacity-80"
                        />
                        <img 
                            src={`${import.meta.env.BASE_URL}plants-growing.gif`}
                            alt="Growing Plants Animation" 
                            className="h-full w-auto object-cover opacity-80"
                        />
                        <img 
                            src={`${import.meta.env.BASE_URL}flowers.gif`}
                            alt="Growing Plants Animation" 
                            className="h-[120%] w-auto object-cover opacity-80"
                        />
                        <img 
                            src={`${import.meta.env.BASE_URL}plants-growing.gif`}
                            alt="Growing Plants Animation" 
                            className="h-full w-auto object-cover opacity-80"
                        />
                        <img 
                            src={`${import.meta.env.BASE_URL}plants-growing.gif`}
                            alt="Growing Plants Animation" 
                            className="h-full w-auto object-cover opacity-80"
                        />
                        <img 
                            src={`${import.meta.env.BASE_URL}flowers.gif`}
                            alt="Growing Plants Animation" 
                            className="h-[120%] w-auto object-cover opacity-80"
                        />
                        <img 
                            src={`${import.meta.env.BASE_URL}plants-growing.gif`}
                            alt="Growing Plants Animation" 
                            className="h-full w-auto object-cover opacity-80"
                        />
                        <img 
                            src={`${import.meta.env.BASE_URL}flowers.gif`}
                            alt="Growing Plants Animation" 
                            className="h-[120%] w-auto object-cover opacity-80"
                        />
                    </div>
                    
                    {/* NeighbourBloom Logo */}
                    <img 
                        src={`${import.meta.env.BASE_URL}neighbourbloom-logo.png`}
                        alt="NeighbourBloom Logo" 
                        className="h-16 w-auto object-contain"
                    />
                    
                    <h2 className="font-bold text-2xl capitalize">
                        Welcome to SDS-HDB combined workspace
                    </h2>
            
                    
                    {/* Start Button - Only show when login form is hidden */}
                    {!showLogin && (
                        <Button 
                            onClick={() => setShowLogin(true)}
                            className="mt-6 w-[200px] uppercase bg-[#7FB685] hover:bg-[#5a9462] text-white"
                        >
                            Start
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Right Side - Login Form with Green Background */}
            <div className={`h-full flex justify-center items-center bg-gradient-to-br from-[#7FB685] to-[#5a9462] p-8 transition-all duration-1000 ease-in-out absolute right-0 top-0 ${showLogin ? 'w-full lg:w-1/2 translate-x-0 opacity-100' : 'w-0 translate-x-full opacity-0 pointer-events-none'}`}>
                <form onSubmit={handleSubmit(handleLogin)} className="w-full max-w-md grid grid-cols-1 gap-4 p-8 border-2 border-white/20 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 hover:scale-105">
                    {/* Email Field */}
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email"
                            {...register('email', { 
                                required: 'Email is required',
                                pattern: {
                                    value: /^\S+@\S+$/i,
                                    message: 'Invalid email address'
                                }
                            })}
                            placeholder="Enter email"
                            type="email"
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                            id="password"
                            {...register('password', { 
                                required: 'Password is required',
                                minLength: {
                                    value: 6,
                                    message: 'Password must be at least 6 characters'
                                }
                            })}
                            placeholder="Enter password"
                            type="password"
                        />
                        {errors.password && (
                            <p className="text-sm text-destructive">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="justify-self-center">
                        <Button 
                            type="submit" 
                            className="w-[200px] uppercase"
                            disabled={loadingFlags?.isSaving}
                        >
                            {loadingFlags?.isSaving ? 'Logging in...' : 'Login'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;