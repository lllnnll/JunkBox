import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import LoginButton from "@/components/LoginButton";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
                <div className="text-center space-y-6">
                    <h1 className="text-4xl font-bold mb-8">Admin Access</h1>
                    <LoginButton />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-white">
            <AdminDashboard />
        </main>
    );
}
