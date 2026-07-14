import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, Edit2, Plus, PlusCircle, Eye, Pencil, Trash2, 
  Check, Loader2, AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const actionsMeta = [
  { key: "create", label: "Create", icon: <PlusCircle className="h-4 w-4" />, color: "text-green-600" },
  { key: "read", label: "Read", icon: <Eye className="h-4 w-4" />, color: "text-blue-600" },
  { key: "update", label: "Update", icon: <Pencil className="h-4 w-4" />, color: "text-amber-600" },
  { key: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" />, color: "text-red-600" },
];

const PermissionsPage = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [matrix, setMatrix] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editPerms, setEditPerms] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Add Permission dialog
  const [isPermDialogOpen, setIsPermDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formModule, setFormModule] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [creatingPerm, setCreatingPerm] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !isAuthenticated) {
      setAuthError(true);
      sonnerToast.error("Please login to access this page");
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (!isAdmin) {
      sonnerToast.error("You don't have permission to access this page");
      setTimeout(() => navigate('/dashboard'), 2000);
      return;
    }

    fetchRoles();
  }, [isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (selectedRoleId) {
      fetchRoleMatrix(selectedRoleId);
    }
  }, [selectedRoleId]);

  const fetchRoles = async () => {
    try {
      const response = await api.getRolesWithPermissions();
      console.log(response,"askjksadj ")
      if (response) {
        setRoles(response);
        if (response.length > 0 && !selectedRoleId) {
          setSelectedRoleId(response[0].id);
        }
      }
    } catch (error) {
      console.error('Fetch roles error:', error);
      
      if (error.status === 401) {
        setAuthError(true);
        localStorage.removeItem('token');
        sonnerToast.error("Session expired. Please login again.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        sonnerToast.error("Failed to fetch roles: " + error.message);
      }
    }
  };

  const fetchRoleMatrix = async (roleId) => {
    setLoading(true);
    try {
      const response = await api.getRolePermissionMatrix(roleId);
      if (response.success) {
        setSelectedRole(response.data.role);
        setMatrix(response.data.matrix);
        setAllModules(response.data.allModules);
      }
    } catch (error) {
      console.error('Fetch matrix error:', error);
      
      if (error.status === 401) {
        setAuthError(true);
        localStorage.removeItem('token');
        sonnerToast.error("Session expired. Please login again.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        sonnerToast.error("Failed to fetch permissions: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    const initialPerms = {};
    matrix.forEach(item => {
      initialPerms[item.module] = item.actions
        .filter(a => a.hasPermission)
        .map(a => a.action);
    });
    setEditPerms(initialPerms);
    setIsEditing(true);
  };

  const toggleAction = (module, action) => {
    setEditPerms(prev => {
      const currentActions = prev[module] || [];
      const newActions = currentActions.includes(action)
        ? currentActions.filter(a => a !== action)
        : [...currentActions, action];
      
      return {
        ...prev,
        [module]: newActions
      };
    });
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      const modulePermissions = Object.entries(editPerms)
        .filter(([_, actions]) => actions.length > 0)
        .map(([module, actions]) => ({
          module,
          actions
        }));

      const response = await api.updateRolePermissions(selectedRoleId, modulePermissions);
      
      toast({ 
        title: "Success", 
        description: response.message || `Permissions for ${selectedRole?.name} updated successfully.` 
      });
      
      setIsEditing(false);
      fetchRoleMatrix(selectedRoleId);
    } catch (error) {
      console.error('Save permissions error:', error);
      
      if (error.status === 401) {
        setAuthError(true);
        localStorage.removeItem('token');
        sonnerToast.error("Session expired. Please login again.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        sonnerToast.error(error.message || "Failed to save permissions");
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditPerms({});
  };

  const hasAction = (module, action) => {
    if (isEditing) {
      return editPerms[module]?.includes(action) || false;
    }
    const moduleData = matrix.find(m => m.module === module);
    const actionData = moduleData?.actions.find(a => a.action === action);
    return actionData?.hasPermission || false;
  };

  const openAddPermission = () => {
    setFormName("");
    setFormModule("");
    setFormDesc("");
    setIsPermDialogOpen(true);
  };

  const handleSavePermission = async () => {
    if (!formName.trim() || !formModule.trim() || !formDesc.trim()) {
      sonnerToast.error("All fields are required");
      return;
    }

    setCreatingPerm(true);
    try {
      const response = await api.createPermission({
        name: formName,
        module: formModule,
        description: formDesc,
        action: "read" // Default action
      });
      
      sonnerToast.success(response.message || "Permission created successfully");
      setIsPermDialogOpen(false);
      
      // Refresh matrix if the same role is selected
      if (selectedRoleId) {
        fetchRoleMatrix(selectedRoleId);
      }
    } catch (error) {
      console.error('Create permission error:', error);
      
      if (error.status === 401) {
        setAuthError(true);
        localStorage.removeItem('token');
        sonnerToast.error("Session expired. Please login again.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        sonnerToast.error(error.message || "Failed to create permission");
      }
    } finally {
      setCreatingPerm(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  if (authError) {
    return (
      <DashboardLayout title="Permissions Management" subtitle="Manage module-wise permissions for roles">
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-6">Your session has expired. Please login again to access this page.</p>
          <Button onClick={handleLoginRedirect} className="bg-primary hover:bg-primary/90">
            Go to Login
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Permissions Management" subtitle="Manage module-wise permissions for roles">
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-end">
          <Button onClick={openAddPermission} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="h-4 w-4" /> Add Permission
          </Button>
        </div>

        {/* Role Selector Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-gray-500" />
              <h2 className="font-display font-bold text-lg">Select Role to Manage Permissions</h2>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Select 
                value={selectedRoleId} 
                onValueChange={(v) => { 
                  setSelectedRoleId(v); 
                  setIsEditing(false); 
                }}
              >
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <span>{role.name}</span>
                        {role.isSystem && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            System
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!isEditing ? (
                <Button 
                  variant="outline" 
                  onClick={startEditing} 
                  className="gap-2"
                  disabled={!selectedRole || selectedRole?.isSystem}
                >
                  <Edit2 className="h-4 w-4" /> Edit Permissions
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    onClick={savePermissions} 
                    className="gap-2 bg-primary hover:bg-primary/90"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={cancelEditing}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {selectedRole && (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-sm text-gray-600">{selectedRole.description}</p>
                {selectedRole.isSystem && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    System role - limited editing
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permission Matrix */}
        {selectedRole && (
          <div>
            <h3 className="font-display font-bold text-lg mb-4">
              Permissions for <span className="text-primary">{selectedRole.name}</span>
            </h3>

            <Card className="overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3.5 px-5 text-sm font-semibold text-gray-600">
                          Module
                        </th>
                        {actionsMeta.map((a) => (
                          <th key={a.key} className="text-center py-3.5 px-5">
                            <div className={`flex items-center justify-center gap-1.5 text-sm font-semibold ${a.color}`}>
                              {a.icon} {a.label}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((item, idx) => (
                        <tr key={item.module} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="py-3.5 px-5 text-sm font-medium">
                            {item.module}
                          </td>
                          {actionsMeta.map((a) => (
                            <td key={a.key} className="text-center py-3.5 px-5">
                              {isEditing && !selectedRole?.isSystem ? (
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={hasAction(item.module, a.key)}
                                    onCheckedChange={() => toggleAction(item.module, a.key)}
                                  />
                                </div>
                              ) : (
                                hasAction(item.module, a.key) ? (
                                  <Check className={`h-5 w-5 mx-auto ${a.color}`} />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {matrix.length === 0 && (
                        <tr>
                          <td colSpan={actionsMeta.length + 1} className="py-12 text-center text-gray-500">
                            No permissions found for this role.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Add Permission Dialog */}
        <Dialog open={isPermDialogOpen} onOpenChange={setIsPermDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Add New Permission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Permission Name <span className="text-red-500">*</span></Label>
                <Input 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  placeholder="e.g. View Orders"
                />
              </div>
              <div className="space-y-2">
                <Label>Module <span className="text-red-500">*</span></Label>
                <Input 
                  value={formModule} 
                  onChange={(e) => setFormModule(e.target.value)} 
                  placeholder="e.g. Orders"
                />
              </div>
              <div className="space-y-2">
                <Label>Description <span className="text-red-500">*</span></Label>
                <Input 
                  value={formDesc} 
                  onChange={(e) => setFormDesc(e.target.value)} 
                  placeholder="What does this permission allow?"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsPermDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSavePermission} 
                  className="bg-primary hover:bg-primary/90"
                  disabled={!formName.trim() || !formModule.trim() || !formDesc.trim() || creatingPerm}
                >
                  {creatingPerm ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Permission'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PermissionsPage;