import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
    const { register, handleSubmit, handleLogin, errors, loadingFlags } = useAuth();

    return (
        <div className="h-full flex flex-col lg:flex-row justify-center items-center gap-3 text-center p-2">
            <div className="w-full flex flex-col justify-center items-center">
                {/* Logo/Image placeholder */}
                <div className="w-1/2 lg:w-1/3 hidden lg:flex justify-center items-center">
                    <img src="/logo.png" alt="Logo" className="w-full h-auto" />
                </div>
                <h2 className="font-bold text-xl capitalize animate-bounce">
                    Welcome to SDS-HDB combined workspace
                </h2>
                <h5 className="text-xs text-black/50 font-bold">
                    Still a WIP thanks
                </h5>
            </div>
            
            <div className="w-full lg:w-1/2">
                {/* Welcome image placeholder */}
                <div className="hidden lg:flex w-1/2 justify-self-center">
                    <img src="/welcome.png" alt="Welcome" className="w-full h-auto" />
                </div>

                <form onSubmit={handleSubmit(handleLogin)} className="w-full grid grid-cols-1 gap-3 justify-center p-5 border shadow-lg">
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