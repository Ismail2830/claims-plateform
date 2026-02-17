'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/app/lib/trpc-client';
import { 
  X, 
  FileText, 
  Calendar, 
  MapPin, 
  DollarSign, 
  AlertTriangle,
  Clock,
  User,
  Phone,
  Mail,
  Plus,
  Trash2
} from 'lucide-react';

interface CreateClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Witness {
  name: string;
  phone: string;
  email: string;
}

export function CreateClaimModal({ isOpen, onClose, onSuccess }: CreateClaimModalProps) {
  const [formData, setFormData] = useState({
    policyId: '',
    incidentDate: '',
    incidentTime: '',
    incidentLocation: '',
    description: '',
    claimType: 'ACCIDENT' as 'ACCIDENT' | 'THEFT' | 'FIRE' | 'WATER_DAMAGE',
    claimedAmount: '',
    damageDescription: '',
    policeReport: false,
    policeReportNumber: '',
    emergencyServices: false,
    emergencyServicesDetails: '',
    additionalNotes: '',
  });

  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch client's policies
  const { data: policiesResponse, isLoading: policiesLoading } = trpc.clientAuth.getPolicies.useQuery(
    undefined,
    {
      enabled: isOpen,
      staleTime: 300000, // 5 minutes
    }
  );

  // Create claim mutation
  const createClaimMutation = trpc.clientAuth.createClaim.useMutation({
    onSuccess: () => {
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      setError(error.message);
      setIsSubmitting(false);
    }
  });

  const policies = policiesResponse?.data || [];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        policyId: '',
        incidentDate: '',
        incidentTime: '',
        incidentLocation: '',
        description: '',
        claimType: 'ACCIDENT',
        claimedAmount: '',
        damageDescription: '',
        policeReport: false,
        policeReportNumber: '',
        emergencyServices: false,
        emergencyServicesDetails: '',
        additionalNotes: '',
      });
      setWitnesses([]);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleAddWitness = () => {
    setWitnesses(prev => [...prev, { name: '', phone: '', email: '' }]);
  };

  const handleRemoveWitness = (index: number) => {
    setWitnesses(prev => prev.filter((_, i) => i !== index));
  };

  const handleWitnessChange = (index: number, field: keyof Witness, value: string) => {
    setWitnesses(prev => 
      prev.map((witness, i) => 
        i === index ? { ...witness, [field]: value } : witness
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await createClaimMutation.mutateAsync({
        ...formData,
        claimedAmount: parseFloat(formData.claimedAmount),
        witnesses: witnesses.filter((w: any) => w.name.trim()),
        policeReportNumber: formData.policeReport ? formData.policeReportNumber : undefined,
        emergencyServicesDetails: formData.emergencyServices ? formData.emergencyServicesDetails : undefined,
      });
    } catch (err) {
      // Error is handled by onError callback
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black bg-opacity-50"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Create New Claim
                </h2>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Policy Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Policy *
                    </label>
                    {policiesLoading ? (
                      <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
                    ) : (
                      <select
                        name="policyId"
                        value={formData.policyId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choose a policy...</option>
                        {policies.map((policy: any) => (
                          <option key={policy.policyId} value={policy.policyId}>
                            {policy.policyNumber} - {policy.policyType} (${policy.insuredAmount.toString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Claim Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Claim Type *
                    </label>
                    <select
                      name="claimType"
                      value={formData.claimType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ACCIDENT">Accident</option>
                      <option value="THEFT">Theft</option>
                      <option value="FIRE">Fire</option>
                      <option value="WATER_DAMAGE">Water Damage</option>
                    </select>
                  </div>

                  {/* Incident Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Incident Date *
                      </label>
                      <input
                        type="date"
                        name="incidentDate"
                        value={formData.incidentDate}
                        onChange={handleInputChange}
                        required
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Incident Time *
                      </label>
                      <input
                        type="time"
                        name="incidentTime"
                        value={formData.incidentTime}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Incident Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Incident Location *
                    </label>
                    <input
                      type="text"
                      name="incidentLocation"
                      value={formData.incidentLocation}
                      onChange={handleInputChange}
                      required
                      placeholder="Street address, city, province"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Claimed Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Claimed Amount *
                    </label>
                    <input
                      type="number"
                      name="claimedAmount"
                      value={formData.claimedAmount}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Incident Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      placeholder="Describe what happened..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Damage Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Damage Description *
                    </label>
                    <textarea
                      name="damageDescription"
                      value={formData.damageDescription}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      placeholder="Describe the damage in detail..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Police Report */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="policeReport"
                        checked={formData.policeReport}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Police report filed</span>
                    </label>
                    {formData.policeReport && (
                      <input
                        type="text"
                        name="policeReportNumber"
                        value={formData.policeReportNumber}
                        onChange={handleInputChange}
                        placeholder="Police report number"
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* Emergency Services */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="emergencyServices"
                        checked={formData.emergencyServices}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Emergency services contacted</span>
                    </label>
                    {formData.emergencyServices && (
                      <textarea
                        name="emergencyServicesDetails"
                        value={formData.emergencyServicesDetails}
                        onChange={handleInputChange}
                        placeholder="Details about emergency services contacted..."
                        rows={2}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* Witnesses */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Witnesses
                      </label>
                      <button
                        type="button"
                        onClick={handleAddWitness}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Witness
                      </button>
                    </div>
                    {witnesses.map((witness, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4 mb-3">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-700">
                            <User className="w-4 h-4 inline mr-1" />
                            Witness #{index + 1}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveWitness(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            placeholder="Full name"
                            value={witness.name}
                            onChange={(e) => handleWitnessChange(index, 'name', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="tel"
                            placeholder="Phone number"
                            value={witness.phone}
                            onChange={(e) => handleWitnessChange(index, 'phone', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="email"
                            placeholder="Email address"
                            value={witness.email}
                            onChange={(e) => handleWitnessChange(index, 'email', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      name="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Any additional information..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Submit Claim
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}