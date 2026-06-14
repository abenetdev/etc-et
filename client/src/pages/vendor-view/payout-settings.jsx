import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Save, CreditCard, Smartphone, Building, Loader2 } from "lucide-react";
import { getPayoutSettings, updatePayoutSettings } from "@/store/vendor/wallet-slice";

export default function PayoutSettings() {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { user } = useSelector((state) => state.auth);
  const { payoutSettings, isLoading } = useSelector((state) => state.vendorWallet);

  const [form, setForm] = useState({
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    chapaAccountName: "",
    chapaAccountNumber: "",
    mobileMoneyNumber: "",
    preferredMethod: "bank",
  });

  const vendorId = user?._id || user?.id;

  // ── Load settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (vendorId) {
      dispatch(getPayoutSettings(vendorId));
    }
  }, [dispatch, vendorId]);

  // ── Sync settings into form ───────────────────────────────────────────────
  useEffect(() => {
    if (payoutSettings) {
      setForm((prev) => ({...prev, ...payoutSettings }));
    }
  }, [payoutSettings]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const result = await dispatch(updatePayoutSettings({ ...form, vendorId }));

    if (result?.payload?.success) {
      toast({
        title: "Settings Saved!",
        description: "Your payout settings have been updated.",
      });
    } else {
      toast({
        title: "Save Failed",
        description: result?.payload?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading && !payoutSettings) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payout Settings</h1>
          <p className="text-muted-foreground">
            Configure where you want to receive your earnings
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {/* Preferred Method */}
      <Card>
        <CardHeader>
          <CardTitle>Preferred Withdrawal Method</CardTitle>
          <CardDescription>
            Choose your default payout method for withdrawal requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={form.preferredMethod} onValueChange={(v) => set("preferredMethod", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Bank Transfer
                </div>
              </SelectItem>
              <SelectItem value="chapa">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Chapa Transfer
                </div>
              </SelectItem>
              <SelectItem value="mobile_money">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile Money
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bank Transfer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Bank Transfer Details
          </CardTitle>
          <CardDescription>
            Bank account where you want to receive your withdrawals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Bank Name</Label>
            <Input
              value={form.bankName}
              onChange={(e) => set("bankName", e.target.value)}
              placeholder="e.g. Commercial Bank of Ethiopia"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Account Holder Name</Label>
            <Input
              value={form.accountHolderName}
              onChange={(e) => set("accountHolderName", e.target.value)}
              placeholder="Full name as per bank records"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input
              value={form.accountNumber}
              onChange={(e) => set("accountNumber", e.target.value)}
              placeholder="Your bank account number"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Chapa Transfer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Chapa Transfer Details
          </CardTitle>
          <CardDescription>
            Chapa account details for instant transfers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Chapa Account Name</Label>
            <Input
              value={form.chapaAccountName}
              onChange={(e) => set("chapaAccountName", e.target.value)}
              placeholder="Your Chapa account name"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Chapa Account Number / Email</Label>
            <Input
              value={form.chapaAccountNumber}
              onChange={(e) => set("chapaAccountNumber", e.target.value)}
              placeholder="Chapa account number or email"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Mobile Money */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Money Details
          </CardTitle>
          <CardDescription>
            Mobile money number for quick payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Mobile Money Number</Label>
            <Input
              value={form.mobileMoneyNumber}
              onChange={(e) => set("mobileMoneyNumber", e.target.value)}
              placeholder="+251 9XX XXX XXX"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your mobile money number with country code
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          Save Payout Settings
        </Button>
      </div>
    </div>
  );
}
