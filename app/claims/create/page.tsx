'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { trpc } from '@/app/lib/trpc-client';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Upload, 
  Calendar, 
  MapPin, 
  AlertCircle,
  Shield,
  Car,
  Home,
  Briefcase,
  CheckCircle,
  X
} from 'lucide-react';

// Types
interface FormData {
  // Step 1: Policy Selection
  policyId: string;
  policyType: string;
  
  // Step 2: Incident Details
  incidentDate: string;
  incidentTime: string;
  incidentLocation: string;
  description: string;
  claimType: 'ACCIDENT' | 'THEFT' | 'FIRE' | 'WATER_DAMAGE' | '';
  
  // Step 3: Damage & Amount
  claimedAmount: number;
  damageDescription: string;
  witnesses: Array<{
    name: string;
    phone: string;
    email: string;
  }>;
  
  // Step 4: Documents
  documents: Array<{
    file: File;
    type: string;
    description: string;
  }>;
  
  // Step 5: Additional Information
  policeReport: boolean;
  policeReportNumber: string;
  emergencyServices: boolean;
  emergencyServicesDetails: string;
  additionalNotes: string;
}

interface Policy {
  policyId: string;
  policyNumber: string;
  policyType: string;
  status: string;
  insuredAmount: number;
  premiumAmount: number;
  startDate: string;
  endDate: string;
}

const STEP_TITLES = [
  'Select Policy',
  'Incident Details', 
  'Damage Assessment',
  'Upload Documents',
  'Additional Info',
  'Review & Submit'
];

const CLAIM_TYPES = [
  { value: 'ACCIDENT', label: 'Accident', icon: Car, color: 'text-red-600 bg-red-100' },
  { value: 'THEFT', label: 'Theft', icon: Shield, color: 'text-purple-600 bg-purple-100' },
  { value: 'FIRE', label: 'Fire Damage', icon: AlertCircle, color: 'text-orange-600 bg-orange-100' },
  { value: 'WATER_DAMAGE', label: 'Water Damage', icon: Home, color: 'text-blue-600 bg-blue-100' },
];

export default function CreateClaimPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState<FormData>({
    policyId: '',
    policyType: '',
    incidentDate: '',
    incidentTime: '',
    incidentLocation: '',
    description: '',
    claimType: '',
    claimedAmount: 0,
    damageDescription: '',
    witnesses: [],
    documents: [],
    policeReport: false,
    policeReportNumber: '',
    emergencyServices: false,
    emergencyServicesDetails: '',
    additionalNotes: ''
  });

  const auth = useSimpleAuth();
  const router = useRouter();
  const { token, user, isLoading } = auth;

  // tRPC hooks
  const { data: policiesData } = trpc.clientAuth.getPolicies.useQuery(
    undefined,
    { enabled: !isLoading && !!token && !!user }
  );
  const createClaimMutation = trpc.clientAuth.createClaim.useMutation();
  
  // Extract policies from tRPC data
  const policies = policiesData?.data || [];

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    switch (step) {
      case 1:
        if (!formData.policyId) newErrors.policyId = 'Please select a policy';
        break;
      case 2:
        if (!formData.incidentDate) newErrors.incidentDate = 'Incident date is required';
        if (!formData.incidentTime) newErrors.incidentTime = 'Incident time is required';
        if (!formData.incidentLocation) newErrors.incidentLocation = 'Incident location is required';
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.claimType) newErrors.claimType = 'Claim type is required';
        break;
      case 3:
        if (!formData.claimedAmount || formData.claimedAmount <= 0) {
          newErrors.claimedAmount = 'Claimed amount must be greater than 0';
        }
        if (!formData.damageDescription) newErrors.damageDescription = 'Damage description is required';
        break;
      case 4:
        if (formData.documents.length === 0) {
          newErrors.documents = 'At least one document is required';
        }
        break;
      case 5:
        if (formData.policeReport && !formData.policeReportNumber) {
          newErrors.policeReportNumber = 'Police report number is required';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;
    
    setIsSubmitting(true);
    try {
      // Prepare the data for submission
      const claimData = {
        policyId: formData.policyId,
        incidentDate: formData.incidentDate,
        incidentTime: formData.incidentTime,
        incidentLocation: formData.incidentLocation,
        description: formData.description,
        claimType: formData.claimType as 'ACCIDENT' | 'THEFT' | 'FIRE' | 'WATER_DAMAGE',
        claimedAmount: formData.claimedAmount,
        damageDescription: formData.damageDescription,
        witnesses: formData.witnesses,
        policeReport: formData.policeReport,
        policeReportNumber: formData.policeReportNumber,
        emergencyServices: formData.emergencyServices,
        emergencyServicesDetails: formData.emergencyServicesDetails,
        additionalNotes: formData.additionalNotes
      };

      console.log('Submitting claim:', claimData);
      
      // Use tRPC mutation to create the claim
      const result = await createClaimMutation.mutateAsync(claimData);
      
      console.log('Claim created successfully:', result.data);
      
      // TODO: Handle document uploads here if needed
      
      // Redirect to dashboard with success message
      router.push('/dashboard/client?claim_created=true');

    } catch (error) {
      console.error('Failed to submit claim:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to submit claim. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addWitness = () => {
    setFormData(prev => ({
      ...prev,
      witnesses: [...prev.witnesses, { name: '', phone: '', email: '' }]
    }));
  };

  const removeWitness = (index: number) => {
    setFormData(prev => ({
      ...prev,
      witnesses: prev.witnesses.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (files: FileList) => {
    const newDocuments = Array.from(files).map((file: File) => ({
      file,
      type: 'PHOTO', // Default type
      description: file.name
    }));
    
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...newDocuments]
    }));
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  // Redirect if not authenticated
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!token || !user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Claim</h1>
                <p className="text-gray-600">Step {currentStep} of 6: {STEP_TITLES[currentStep - 1]}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {STEP_TITLES.map((title, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index + 1 <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1 < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEP_TITLES.length - 1 && (
                  <div
                    className={`w-12 h-0.5 ml-2 ${
                      index + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
          >
            {/* Step 1: Policy Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Select Policy</h2>
                  <p className="text-gray-600">Choose the insurance policy this claim is for</p>
                </div>
                
                <div className="grid gap-4">
                  {!policiesData ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading your policies...</p>
                    </div>
                  ) : policies.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No active policies found. Please contact support to add a policy.</p>
                    </div>
                  ) : (
                    policies.map((policy: any) => (
                    <label
                      key={policy.policyId}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.policyId === policy.policyId
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="policy"
                        value={policy.policyId}
                        checked={formData.policyId === policy.policyId}
                        onChange={(e) => {
                          const selectedPolicy = policies.find((p: any) => p.policyId === e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            policyId: e.target.value,
                            policyType: selectedPolicy?.policyType || ''
                          }));
                        }}
                        className="sr-only"
                      />
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {policy.policyType}
                          </h3>
                          <p className="text-sm text-gray-600">Policy: {policy.policyNumber}</p>
                          <p className="text-sm text-gray-600">
                            Coverage: MAD {policy.insuredAmount?.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {policy.status}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            Expires: {new Date(policy.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </label>
                  )))}
                </div>
                
                {errors.policyId && (
                  <p className="text-sm text-red-600">{errors.policyId}</p>
                )}
              </div>
            )}

            {/* Step 2: Incident Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Incident Details</h2>
                  <p className="text-gray-600">Tell us what happened and when</p>
                </div>

                {/* Claim Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Type of Claim *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {CLAIM_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <label
                          key={type.value}
                          className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.claimType === type.value
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="claimType"
                            value={type.value}
                            checked={formData.claimType === type.value}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              claimType: e.target.value as FormData['claimType']
                            }))}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type.color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-gray-900">{type.label}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {errors.claimType && (
                    <p className="text-sm text-red-600 mt-1">{errors.claimType}</p>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Incident *
                    </label>
                    <input
                      type="date"
                      value={formData.incidentDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, incidentDate: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.incidentDate && (
                      <p className="text-sm text-red-600 mt-1">{errors.incidentDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time of Incident *
                    </label>
                    <input
                      type="time"
                      value={formData.incidentTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, incidentTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.incidentTime && (
                      <p className="text-sm text-red-600 mt-1">{errors.incidentTime}</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location of Incident *
                  </label>
                  <input
                    type="text"
                    value={formData.incidentLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, incidentLocation: e.target.value }))}
                    placeholder="Street address, city, or specific location"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.incidentLocation && (
                    <p className="text-sm text-red-600 mt-1">{errors.incidentLocation}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description of Incident *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide detailed description of what happened..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Damage Assessment */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Damage Assessment</h2>
                  <p className="text-gray-600">Estimate the damage and provide details</p>
                </div>

                {/* Claimed Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Claim Amount (MAD) *
                  </label>
                  <input
                    type="number"
                    value={formData.claimedAmount || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      claimedAmount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.claimedAmount && (
                    <p className="text-sm text-red-600 mt-1">{errors.claimedAmount}</p>
                  )}
                </div>

                {/* Damage Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detailed Damage Description *
                  </label>
                  <textarea
                    value={formData.damageDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, damageDescription: e.target.value }))}
                    placeholder="Describe the damage in detail..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.damageDescription && (
                    <p className="text-sm text-red-600 mt-1">{errors.damageDescription}</p>
                  )}
                </div>

                {/* Witnesses */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Witnesses (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={addWitness}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add Witness
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.witnesses.map((witness, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Witness {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeWitness(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={witness.name}
                            onChange={(e) => {
                              const newWitnesses = [...formData.witnesses];
                              newWitnesses[index].name = e.target.value;
                              setFormData(prev => ({ ...prev, witnesses: newWitnesses }));
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="tel"
                            placeholder="Phone"
                            value={witness.phone}
                            onChange={(e) => {
                              const newWitnesses = [...formData.witnesses];
                              newWitnesses[index].phone = e.target.value;
                              setFormData(prev => ({ ...prev, witnesses: newWitnesses }));
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={witness.email}
                            onChange={(e) => {
                              const newWitnesses = [...formData.witnesses];
                              newWitnesses[index].email = e.target.value;
                              setFormData(prev => ({ ...prev, witnesses: newWitnesses }));
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Document Upload */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Documents</h2>
                  <p className="text-gray-600">Upload photos and supporting documents</p>
                </div>

                {/* File Upload Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supporting Documents *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900">Upload Files</p>
                      <p className="text-gray-600">
                        Drag and drop or click to select photos, receipts, reports, etc.
                      </p>
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                      >
                        Choose Files
                      </label>
                    </div>
                  </div>
                  {errors.documents && (
                    <p className="text-sm text-red-600 mt-1">{errors.documents}</p>
                  )}
                </div>

                {/* Uploaded Documents List */}
                {formData.documents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Uploaded Documents</h3>
                    <div className="space-y-2">
                      {formData.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{doc.file.name}</p>
                              <p className="text-xs text-gray-600">
                                {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Additional Information */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Additional Information</h2>
                  <p className="text-gray-600">Provide any additional relevant details</p>
                </div>

                {/* Police Report */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="policeReport"
                      checked={formData.policeReport}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        policeReport: e.target.checked,
                        policeReportNumber: e.target.checked ? prev.policeReportNumber : ''
                      }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="policeReport" className="text-sm font-medium text-gray-700">
                      Police report was filed
                    </label>
                  </div>
                  {formData.policeReport && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Police Report Number *
                      </label>
                      <input
                        type="text"
                        value={formData.policeReportNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, policeReportNumber: e.target.value }))}
                        placeholder="Enter police report number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.policeReportNumber && (
                        <p className="text-sm text-red-600 mt-1">{errors.policeReportNumber}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Emergency Services */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="emergencyServices"
                      checked={formData.emergencyServices}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        emergencyServices: e.target.checked,
                        emergencyServicesDetails: e.target.checked ? prev.emergencyServicesDetails : ''
                      }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="emergencyServices" className="text-sm font-medium text-gray-700">
                      Emergency services were involved (ambulance, fire department, etc.)
                    </label>
                  </div>
                  {formData.emergencyServices && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Services Details
                      </label>
                      <textarea
                        value={formData.emergencyServicesDetails}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyServicesDetails: e.target.value }))}
                        placeholder="Describe which emergency services were involved and their actions..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                    placeholder="Any additional information you think is relevant..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Review & Submit */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Review & Submit</h2>
                  <p className="text-gray-600">Please review your claim details before submitting</p>
                </div>

                <div className="space-y-6">
                  {/* Policy Information */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Policy Information</h3>
                    <p className="text-sm text-gray-600">Policy Type: {formData.policyType}</p>
                    <p className="text-sm text-gray-600">Policy ID: {formData.policyId}</p>
                  </div>

                  {/* Incident Details */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Incident Details</h3>
                    <p className="text-sm text-gray-600">Type: {formData.claimType}</p>
                    <p className="text-sm text-gray-600">Date: {formData.incidentDate} at {formData.incidentTime}</p>
                    <p className="text-sm text-gray-600">Location: {formData.incidentLocation}</p>
                    <p className="text-sm text-gray-600">Description: {formData.description}</p>
                  </div>

                  {/* Damage Assessment */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Damage Assessment</h3>
                    <p className="text-sm text-gray-600">
                      Estimated Amount: MAD {formData.claimedAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Damage: {formData.damageDescription}</p>
                    {formData.witnesses.length > 0 && (
                      <p className="text-sm text-gray-600">Witnesses: {formData.witnesses.length} person(s)</p>
                    )}
                  </div>

                  {/* Documents */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Documents</h3>
                    <p className="text-sm text-gray-600">{formData.documents.length} document(s) uploaded</p>
                  </div>

                  {/* Additional Information */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Additional Information</h3>
                    <p className="text-sm text-gray-600">
                      Police Report: {formData.policeReport ? 'Yes' : 'No'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Emergency Services: {formData.emergencyServices ? 'Yes' : 'No'}
                    </p>
                    {formData.additionalNotes && (
                      <p className="text-sm text-gray-600">Additional Notes: {formData.additionalNotes}</p>
                    )}
                  </div>
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Claim
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}