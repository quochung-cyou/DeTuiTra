import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { Separator } from "@/components/ui/separator";

export function LoginForm() {
  const { login, loginWithEmail, registerWithEmail, isAuthLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const from = (location.state as any)?.from || "/dashboard";

  const handleGoogleLogin = async () => {
    try {
      await login();
      navigate(from, { replace: true });
    } catch (err) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {}
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isRegister ? "Đăng ký tài khoản" : "Đăng nhập"}
        </CardTitle>
        <CardDescription>
          {isRegister 
            ? "Tạo tài khoản mới để bắt đầu quản lý quỹ" 
            : "Đăng nhập vào tài khoản của bạn để tiếp tục"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isAuthLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isAuthLoading}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isAuthLoading}
          >
            {isAuthLoading 
              ? (isRegister ? "Đang đăng ký..." : "Đang đăng nhập...") 
              : (isRegister ? "Đăng ký" : "Đăng nhập")}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Hoặc tiếp tục với
            </span>
          </div>
        </div>

        <Button 
          onClick={handleGoogleLogin} 
          className="w-full flex items-center justify-center gap-2" 
          variant="outline"
          disabled={isAuthLoading}
        >
          <FcGoogle className="h-5 w-5" />
          Đăng nhập với Google
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          variant="link" 
          className="px-0 font-normal" 
          onClick={() => setIsRegister(!isRegister)}
          disabled={isAuthLoading}
        >
          {isRegister 
            ? "Đã có tài khoản? Đăng nhập ngay" 
            : "Chưa có tài khoản? Đăng ký tại đây"}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          {isRegister 
            ? "Bằng cách đăng ký, bạn đồng ý với các điều khoản của chúng tôi" 
            : "Sử dụng tài khoản của bạn để truy cập hệ thống"}
        </p>
      </CardFooter>
    </Card>
  );
}
