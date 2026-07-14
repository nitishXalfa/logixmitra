import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Scale, Upload, CheckCircle, XCircle, Clock, Plus } from "lucide-react";
import { UPLOAD_BASE_URL } from "../../services/config";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "../../services/orderApi";
import { sellerApi } from "../../services/sellerApi"; 
import {apiRequest} from "../../src/apiglobal/apiconfig"
import { getuserid,getuser,storetmpdata } from "../../services/getbasicdata";



interface Dispute {
  id: string;
  orderId: string;
  seller: string;
  courier: string;
  type: "weight" | "damage" | "lost" | "delay";
  claimedWeight: string;
  actualWeight: string;
  amount: string;
  status: "open" | "under_review" | "approved" | "rejected";
  date: string;
  proof: boolean;
  courierResponse: string;
}

const initialDisputes: Dispute[] = [
  // { id: "DSP-001", orderId: "ORD-7821", seller: "FashionHub", courier: "BlueDart", type: "weight", claimedWeight: "0.5 kg", actualWeight: "1.2 kg", amount: "₹120", status: "open", date: "2026-02-24", proof: true, courierResponse: "" },
  // { id: "DSP-002", orderId: "ORD-7818", seller: "GadgetZone", courier: "DTDC", type: "damage", claimedWeight: "-", actualWeight: "-", amount: "₹2,500", status: "under_review", date: "2026-02-23", proof: true, courierResponse: "Under investigation" },
  // { id: "DSP-003", orderId: "ORD-7810", seller: "TechWorld", courier: "Delhivery", type: "lost", claimedWeight: "-", actualWeight: "-", amount: "₹4,800", status: "approved", date: "2026-02-22", proof: false, courierResponse: "Shipment confirmed lost. Credit issued." },
  // { id: "DSP-004", orderId: "ORD-7805", seller: "HomeDecor", courier: "Ecom Express", type: "weight", claimedWeight: "2.0 kg", actualWeight: "3.5 kg", amount: "₹180", status: "rejected", date: "2026-02-21", proof: true, courierResponse: "Weight verified at hub. No discrepancy found." },
  // { id: "DSP-005", orderId: "ORD-7800", seller: "SportsGear", courier: "Xpressbees", type: "delay", claimedWeight: "-", actualWeight: "-", amount: "₹500", status: "open", date: "2026-02-24", proof: false, courierResponse: "" },
];

const statusStyles = {
  open: "bg-warning/10 text-warning",
  under_review: "bg-info/10 text-info",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const typeStyles = {
  weight: "bg-accent/10 text-accent",
  damage: "bg-destructive/10 text-destructive",
  lost: "bg-destructive/10 text-destructive",
  delay: "bg-warning/10 text-warning",
};

const DisputesPage = () => {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState(initialDisputes);
  const [search, setSearch] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createOpenx, setCreateOpenx] = useState(false);
  const [proof, setproof] = useState("");


  
  const [formData, setFormData] = useState({ orderId: "", seller: "", courier: "", type: "weight" as const, claimedWeight: "", actualWeight: "", amount: "" });



  const [orders, setOrders] = useState([]);

const [allsellerlist, setallsellerlist] = useState([]);
  const [allsellerlistid, setallsellerlistid] = useState({});
  const filtered = orders.filter(d =>
    d.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    open: disputes.filter(d => d.status === "open").length,
    review: disputes.filter(d => d.status === "under_review").length,
    approved: disputes.filter(d => d.status === "approved").length,
    rejected: disputes.filter(d => d.status === "rejected").length,
  };

  const handleApprove = (id: string) => {
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: "approved" as const } : d));
    toast({ title: "Dispute approved", description: "Settlement adjustment will be applied." });
  };

  const handleReject = (id: string) => {
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: "rejected" as const } : d));
    toast({ title: "Dispute rejected", variant: "destructive" });
  };

  const handleCreate = () => {
    const newDispute: Dispute = {
      id: `DSP-${String(disputes.length + 6).padStart(3, "0")}`,
      ...formData,
      status: "open",
      date: new Date().toISOString().split("T")[0],
      proof: false,
      courierResponse: "",
    };
    setDisputes(prev => [newDispute, ...prev]);
    setCreateOpen(false);
    toast({ title: "Dispute created" });
  };

const fetchorder=async()=>{
    try {
        const data = await orderApi.getAll();
        const data2=await sellerApi.getAll()
      storetmpdata.ordernumber=[]
      const tmpdata=[]
       for(const x of data){
  
        if(x.dispute_status!="" && x.dispute_status!=null){
           tmpdata.push(x)
        }
  
  storetmpdata.ordernumber.push(x.orderNumber)
  
        
       }
  
  
  
        setOrders(tmpdata);
        const temp={}
        for(const x of data2){
          temp[x.id]=x
        }
        setallsellerlistid(temp)
        setallsellerlist(data2)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        });
      } finally {
        // no-op
      }

}


useEffect(()=>{
fetchorder()
},[])

const uploaddcoument=async(e)=>{
  const formdata=new FormData()
  formdata.append("file",e.target.files[0])

const uploadRes = await fetch(`${UPLOAD_BASE_URL}/upload`,{
  method:"POST",
  body:formdata
})
const uploadData = await uploadRes.json() as { filename?: string; fileInfo?: { filename?: string } }
e.target.value=""

setproof(uploadData?.filename || uploadData?.fileInfo?.filename || "")


}

const approreject=async(tmpod,statuss)=>{

 if(statuss=="Rejected" && proof==""){
  alert("Please Upload Proof")

  return 
 }

  const payload={
    dispute_status:statuss,
    dispute_file:proof || "",
    dispute_file_:tmpod?.dispute_file_ || "",
    orderNumber:tmpod?.orderNumber || "",
    previousweight:tmpod?.previousweight || "",
    claimweight:tmpod?.claimweight || "",
    dispute_reason:"",
  }

  const response =await apiRequest("POST","orders/dispute_order",payload,{})
fetchorder()

setCreateOpenx(false)


}










  return (
    <DashboardLayout title="Disputes & Claims" subtitle="Manage weight disputes, damage claims, and settlements">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* <StatCard title="Open" value={String(stats.open)} icon={<Clock className="h-5 w-5" />} variant="warning" />
          <StatCard title="Under Review" value={String(stats.review)} icon={<Scale className="h-5 w-5" />} variant="accent" />
          <StatCard title="Approved" value={String(stats.approved)} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
          <StatCard title="Rejected" value={String(stats.rejected)} icon={<XCircle className="h-5 w-5" />} /> */}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search disputes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          {/* <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Dispute</Button> */}
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[ "Order Number", "Seller", "Courier", "Amount", "Status","Proof","Previous Wieght","Claim Wieght", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{d.orderNumber}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{allsellerlistid[d.seller].name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{d.courier}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{d.amount}</td>
                    <td className="py-3 px-4">{d.dispute_status=="Disputed" && d.dispute_file==""?"Pending":d.dispute_status}</td>
                     
                    <td className="py-3 px-4 text-sm font-medium text-foreground"  style={{cursor:"pointer"}}>{d.dispute_file_!=""?<span onClick={async()=>{
                       setCreateOpen(true)
                            const previewRes = await fetch(`${UPLOAD_BASE_URL}/preview/`+d.dispute_file_)
                            const previewHtml = await previewRes.text()
                            document.getElementById("fileopen").innerHTML = previewHtml

                    }}>View</span>:""}</td>

                    <td className="py-3 px-4 text-sm font-medium text-foreground">{d.previousweight}</td>

                    <td className="py-3 px-4 text-sm font-medium text-foreground">{d.claimweight}</td>


                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                   
                        {d.dispute_file!="" && (
                          <Button size="sm" variant="ghost" onClick={async() => {
                            setCreateOpen(true)
                            const previewRes = await fetch(`${UPLOAD_BASE_URL}/preview/`+d.dispute_file)
                            const previewHtml = await previewRes.text()
                            document.getElementById("fileopen").innerHTML = previewHtml
                          }}>View</Button>
                        )}
                        {(d.dispute_status == "Disputed") &&(
                          <>
                            <Button size="sm" variant="outline" className="text-success" onClick={() =>{ 
                              if(confirm("Are you sure you want to Approve")){
                                  approreject(d,"Approved")
                              }
                               }
                          }>Approve</Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                              setSelectedDispute(d);
                              setCreateOpenx(true)
                            }}>Reject</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Dispute Details — {selectedDispute?.id}</DialogTitle>
            <DialogDescription>Order: {selectedDispute?.orderId}</DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Seller</p><p className="font-medium text-foreground">{selectedDispute.seller}</p></div>
              <div><p className="text-muted-foreground">Courier</p><p className="font-medium text-foreground">{selectedDispute.courier}</p></div>
              <div><p className="text-muted-foreground">Type</p><Badge className={typeStyles[selectedDispute.type]}>{selectedDispute.type}</Badge></div>
              <div><p className="text-muted-foreground">Amount</p><p className="font-medium text-foreground">{selectedDispute.amount}</p></div>
              {selectedDispute.type === "weight" && (
                <>
                  <div><p className="text-muted-foreground">Claimed Weight</p><p className="font-medium text-foreground">{selectedDispute.claimedWeight}</p></div>
                  <div><p className="text-muted-foreground">Actual Weight</p><p className="font-medium text-foreground">{selectedDispute.actualWeight}</p></div>
                </>
              )}
              {selectedDispute.courierResponse && (
                <div className="col-span-2"><p className="text-muted-foreground">Courier Response</p><p className="font-medium text-foreground">{selectedDispute.courierResponse}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog> */}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}   >
        <DialogContent>
          <DialogHeader>
           
          </DialogHeader>
          <div id="fileopen" style={{maxHeight:"70vh",overflowY:"auto"}}>

          </div>
          
          
        </DialogContent>
      </Dialog>





      <Dialog open={createOpenx} onOpenChange={setCreateOpenx}   >
        <DialogContent>
               <Button size="sm" variant="ghost" onClick={() =>{
                                     document.getElementById("fileupload").click()
                        }
                          }>&#8593; Upload Proof</Button>
                          {proof}



                          <input type="file" id="fileupload" hidden   onChange={(e)=>uploaddcoument(e)}/>
         
          <DialogFooter>
          <Button onClick={()=>{
            setCreateOpenx(false)
          }}>Cancel</Button>
          <Button  className="text-destructive" onClick={() => {

                                  approreject(selectedDispute,"Rejected")



          }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DisputesPage;
