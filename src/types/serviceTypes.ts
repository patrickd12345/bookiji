export interface ServiceTypeProposal {
  id: string;
  proposedServiceType: string;
  submittedBy: {
    businessName: string;
    email: string;
    phone: string;
  };
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

export interface ServiceTypeApprovalNotification {
  type: 'service_type_proposal';
  proposal: ServiceTypeProposal;
  action: 'approve' | 'reject';
} 