import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Upload, ArrowLeft, CheckCircle, Clock, XCircle, Loader2, Image } from 'lucide-react';

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  image_verified: boolean;
  verification_image_url: string | null;
  verification_status: string | null;
  wallet_balance: number;
}

const ProfilePage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else {
        fetchProfile();
      }
    }
  }, [user, loading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, phone_verified, email_verified, image_verified, verification_image_url, verification_status, wallet_balance')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
    setIsLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('verification-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('verification-images')
        .getPublicUrl(fileName);

      // Update profile with verification_status as pending
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          verification_image_url: urlData.publicUrl,
          verification_status: 'pending',
          image_verified: false
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Document uploaded',
        description: 'Your verification document has been submitted and is pending admin approval.',
      });

      fetchProfile();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload verification document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getVerificationStatusBadge = () => {
    if (!profile) return null;

    if (profile.image_verified) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }

    if (profile.verification_status === 'rejected') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    }

    if (profile.verification_image_url && profile.verification_status === 'pending') {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Pending Approval
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not Submitted
      </Badge>
    );
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
              <p className="text-sm text-muted-foreground">Manage your account</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Profile Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>{profile?.full_name || 'User'}</CardTitle>
                <CardDescription>{profile?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Phone</Label>
                <p className="text-foreground">{profile?.phone || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Wallet Balance</Label>
                <p className="text-foreground font-semibold">₦{((profile?.wallet_balance || 0) / 100).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">ID Verification</CardTitle>
                <CardDescription>
                  Upload a government-issued ID for account verification
                </CardDescription>
              </div>
              {getVerificationStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current verification image preview */}
            {profile?.verification_image_url && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Uploaded Document</Label>
                <div className="relative w-full max-w-sm aspect-video rounded-lg border border-border overflow-hidden bg-muted">
                  <img 
                    src={profile.verification_image_url} 
                    alt="Verification document" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Status message */}
            {profile?.verification_status === 'pending' && profile?.verification_image_url && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-500">Verification Pending</p>
                    <p className="text-sm text-muted-foreground">
                      Your document has been submitted and is awaiting admin approval. This usually takes 1-2 business days.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {profile?.verification_status === 'rejected' && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-500">Verification Rejected</p>
                    <p className="text-sm text-muted-foreground">
                      Your document was not accepted. Please upload a clear, valid government-issued ID.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {profile?.image_verified && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-500">Verified</p>
                    <p className="text-sm text-muted-foreground">
                      Your identity has been verified.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload button - show if not verified or if rejected */}
            {(!profile?.image_verified) && (
              <div>
                <Label 
                  htmlFor="verification-upload"
                  className="block w-full cursor-pointer"
                >
                  <input
                    id="verification-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                  <div 
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
                      profile?.verification_image_url 
                        ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {profile?.verification_image_url ? 'Upload New Document' : 'Upload Verification Document'}
                      </>
                    )}
                  </div>
                </Label>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Accepted: JPG, PNG (max 5MB). Must be a clear photo of your government-issued ID.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProfilePage;
