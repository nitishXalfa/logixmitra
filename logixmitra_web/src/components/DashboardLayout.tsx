import { ReactNode,useEffect,useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getuserid } from "../../services/getbasicdata";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { sellerApi, CreateSellerDTO } from "../../services/sellerApi";
import api from "../../services/api";
import { API_BASE_URL } from "../../services/config";
import { defaultNavSections, filterNavByPermissions, NavSection } from "@/config/navigation";








interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  hidePageHeader?: boolean;
}





interface Seller {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  gst: string;
  roleId: string;
  password: string;


  status: "active" | "blocked" | "pending";
  kycStatus: "verified" | "pending" | "rejected";
  totalOrders: number;
  revenue: string;
  joinedAt: string;
  address: string;
  pincode: string;
  city: string;
  state: string;


  walletBalance: number;
  performanceScore: number;
  rtoRate: number;
  riskCategory: "low" | "medium" | "high";
  subscription: string;
}

type SellerStatus = "active" | "blocked" | "pending";
type KycStatus = "verified" | "pending" | "rejected";
type RiskCategory = "low" | "medium" | "high";

const statusStyles = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
};

const kycStyles = {
  verified: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
};

const riskStyles = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
};

const emptySeller: CreateSellerDTO = {
  name: "",
  email: "",
  company: "",
  phone: "",
  gst: "",
  address: "",
  status: "pending",
  kycStatus: "pending",
  riskCategory: "low",
  subscription: "Trial"
};




// Form Fields Component with proper focus handling
const FormFields = ({ formData, setFormData }: { 
  formData: CreateSellerDTO;
  setFormData: React.Dispatch<React.SetStateAction<CreateSellerDTO>>;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
    <div className="space-y-2">
      <Label htmlFor="sellerName">Name *</Label>
      <Input 
        id="sellerName"
        value={formData.name} 
        onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} 
        placeholder="Enter seller name"
        autoComplete="off"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="sellerEmail">Email *</Label>
      <Input 
        id="sellerEmail"
        type="email"
        value={formData.email} 
        onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} 
        placeholder="seller@example.com"
      />
    </div>
   
    <div className="space-y-2">
      <Label htmlFor="sellerPhone">Phone *</Label>
      <Input 
        id="sellerPhone"
        value={formData.phone} 
        onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} 
        placeholder="+91 98765 43210"
      />
    </div>
   
    <div className="space-y-2">
      <Label htmlFor="sellerAddress">Address *</Label>
      <Input 
        id="sellerAddress"
        value={formData.address} 
        onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} 
        placeholder="City, State"
      />
    </div>



     <div className="space-y-2">
      <Label htmlFor="sellerAddress">Pincode *</Label>
      <Input 
        id="sellerAddress"
        value={formData.pincode} 
        onChange={e => setFormData(f => ({ ...f, pincode: e.target.value }))} 
        placeholder="pincode"
      />
    </div>
     <div className="space-y-2">
      <Label htmlFor="sellerAddress">City *</Label>
      <Input 
        id="sellerAddress"
        value={formData.city} 
        onChange={e => setFormData(f => ({ ...f, city: e.target.value }))} 
        placeholder="city"
      />
    </div>
     <div className="space-y-2">
      <Label htmlFor="sellerAddress">State *</Label>
      <Input 
        id="sellerAddress"
        value={formData.state} 
        onChange={e => setFormData(f => ({ ...f, state: e.target.value }))} 
        placeholder="state"
      />
    </div>



  </div>
);

const ProfileDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CreateSellerDTO>(emptySeller);
  const [editSeller, setEditSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await sellerApi.getAll({});
        const list = Array.isArray(data) ? data : [];
        const mine = list.find((s: Seller) => String(s.id) === String(getuserid()));
        if (mine) {
          setEditSeller(mine);
          setFormData({ ...emptySeller, ...mine });
        } else {
          toast({ title: "Profile not found", description: "No seller profile linked to this account.", variant: "destructive" });
          onOpenChange(false);
        }
      } catch {
        toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [open, onOpenChange, toast]);

  const handleUpdate = async () => {
    if (!editSeller) return;
    try {
      await sellerApi.update(editSeller.id, formData);
      toast({ title: "Success", description: "Profile updated successfully" });
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-foreground">Profile — {editSeller?.company || "My Account"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading profile...</p>
        ) : (
          <FormFields formData={formData} setFormData={setFormData} />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={loading || !editSeller}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};







const DashboardLayout = ({ children, title, subtitle, hidePageHeader }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tmpm,settmpm]=useState<NavSection[]>(defaultNavSections)
  const [wallet,setwallet]=useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const userwallet=async ()=>{
    try {


      const response = await fetch(`${API_BASE_URL}/users/${getuserid()}`,{
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        }
      });
      const data = await response.json();
      setwallet(data?.data?.walletBalance || 0)
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      return null;
    }
  } 




  const handleLogout = () => {
    logout();
    navigate("/");
  };

useEffect(()=>{
 const userData = JSON.parse(localStorage.getItem("user") || "{}");
 const permissionlist = userData?.permissions || [];
 const isAdmin = userData?.role === "admin";
 const filtered = filterNavByPermissions(defaultNavSections, permissionlist, isAdmin);
 settmpm(filtered.length > 0 ? filtered : defaultNavSections);
 userwallet();
},[])



 

  return (
    <>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <AppShell
        title={title}
        subtitle={subtitle}
        hidePageHeader={hidePageHeader}
        navSections={tmpm}
        user={user}
        wallet={wallet}
        onLogout={handleLogout}
        onProfileClick={() => setProfileOpen(true)}
        onWalletRefresh={() => userwallet()}
      >
        {children}
      </AppShell>
    </>
  );
};

export default DashboardLayout;
