import Image from "next/image";
import logo from "@/images/logo.png";

export default function CompleteProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Image src={logo} alt="" className="size-16 rounded-full object-cover" />
        <span className="font-heading text-2xl font-semibold text-primary">Faith Circle</span>
      </div>
      {children}
    </div>
  );
}
