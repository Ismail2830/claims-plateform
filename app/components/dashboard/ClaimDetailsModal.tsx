'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Shield, 
  Calendar, 
  MapPin, 
  DollarSign, 
  FileText, 
  AlertCircle,
  Clock,
  Edit,
  Trash2,
  Save,
  XCircle
} from 'lucide-react';

interface ClaimDetailsModalProps {
  claim: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (claimId: string, data: any) => Promise<void>;
  onDelete: (claimId: string) => Promise<void>;
}

export default function ClaimDetailsModal({ 
  claim, 
  isOpen, 
  onClose, 
  onUpdate, 
  onDelete 
}: ClaimDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (claim && isOpen) {
      setEditData({
        claimType: claim.claimType || '',
        incidentLocation: claim.incidentLocation || '',
        description: claim.description || '',
        damageDescription: claim.damageDescription || '',
        claimedAmount: claim.claimedAmount || '',
        estimatedAmount: claim.estimatedAmount || '',
        approvedAmount: claim.approvedAmount || '',
        status: claim.status || '',
        priority: claim.priority || '',
        additionalNotes: claim.additionalNotes || ''
      });
    }
  }, [claim, isOpen]);

  if (!isOpen || !claim) return null;

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await onUpdate(claim.claimId, editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating claim:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete claim ${claim.claimNumber}? This action cannot be undone.`)) {
      setLoading(true);
      try {
        await onDelete(claim.claimId);
        onClose();
      } catch (error) {
        console.error('Error deleting claim:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DECLARED':
        return 'bg-blue-100 text-blue-800';
      case 'ANALYZING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'NORMAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{claim.claimNumber}</h2>
              <p className="text-sm text-gray-500">Claim Details</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  disabled={loading}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Client</p>
                      <p className="text-sm text-gray-600">
                        {claim.client ? `${claim.client.firstName} ${claim.client.lastName}` : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {claim.client?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Policy</p>
                      <p className="text-sm text-gray-600">
                        {claim.policy ? `${claim.policy.policyNumber} (${claim.policy.policyType})` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Incident Date</p>
                      <p className="text-sm text-gray-600">
                        {new Date(claim.incidentDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Declared Date</p>
                      <p className="text-sm text-gray-600">
                        {new Date(claim.declarationDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Priority */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Priority</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Status</p>
                    {isEditing ? (
                      <select
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="DECLARED">Declared</option>
                        <option value="ANALYZING">Analyzing</option>
                        <option value="DOCS_REQUIRED">Docs Required</option>
                        <option value="UNDER_EXPERTISE">Under Expertise</option>
                        <option value="IN_DECISION">In Decision</option>
                        <option value="APPROVED">Approved</option>
                        <option value="IN_PAYMENT">In Payment</option>
                        <option value="CLOSED">Closed</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                        {claim.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Priority</p>
                    {isEditing ? (
                      <select
                        value={editData.priority}
                        onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="LOW">Low</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(claim.priority)}`}>
                        {claim.priority}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Assigned To</p>
                    <p className="text-sm text-gray-600">
                      {claim.assignedUser ? 
                        `${claim.assignedUser.firstName} ${claim.assignedUser.lastName}` : 
                        'Unassigned'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Claim Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Claim Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Type</p>
                    {isEditing ? (
                      <select
                        value={editData.claimType}
                        onChange={(e) => setEditData({ ...editData, claimType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="ACCIDENT">Accident</option>
                        <option value="THEFT">Theft</option>
                        <option value="FIRE">Fire</option>
                        <option value="WATER_DAMAGE">Water Damage</option>
                      </select>
                    ) : (
                      <p className="text-sm text-gray-600">{claim.claimType}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Location</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.incidentLocation}
                        onChange={(e) => setEditData({ ...editData, incidentLocation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Incident location"
                      />
                    ) : (
                      <p className="text-sm text-gray-600">{claim.incidentLocation || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Claimed Amount</p>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.claimedAmount}
                          onChange={(e) => setEditData({ ...editData, claimedAmount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">
                          MAD {claim.claimedAmount?.toLocaleString() || '0'}
                        </p>
                      )}
                    </div>
                  </div>

                  {(claim.estimatedAmount || isEditing) && (
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Estimated Amount</p>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.estimatedAmount}
                            onChange={(e) => setEditData({ ...editData, estimatedAmount: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        ) : (
                          <p className="text-sm text-gray-600">
                            MAD {claim.estimatedAmount?.toLocaleString() || '0'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {(claim.approvedAmount || isEditing) && (
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Approved Amount</p>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.approvedAmount}
                            onChange={(e) => setEditData({ ...editData, approvedAmount: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        ) : (
                          <p className="text-sm font-green-600 font-medium">
                            MAD {claim.approvedAmount?.toLocaleString() || '0'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
              {isEditing ? (
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Incident description"
                />
              ) : (
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {claim.description || 'No description provided.'}
                </p>
              )}
            </div>

            {(claim.damageDescription || isEditing) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Damage Description</h3>
                {isEditing ? (
                  <textarea
                    value={editData.damageDescription}
                    onChange={(e) => setEditData({ ...editData, damageDescription: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Damage description"
                  />
                ) : (
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {claim.damageDescription || 'No damage description provided.'}
                  </p>
                )}
              </div>
            )}

            {isEditing && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h3>
                <textarea
                  value={editData.additionalNotes}
                  onChange={(e) => setEditData({ ...editData, additionalNotes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes"
                />
              </div>
            )}
          </div>

          {/* Edit Mode Actions */}
          {isEditing && (
            <div className="mt-8 flex items-center space-x-4 pt-6 border-t border-gray-200">
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reset edit data
                  setEditData({
                    claimType: claim.claimType || '',
                    incidentLocation: claim.incidentLocation || '',
                    description: claim.description || '',
                    damageDescription: claim.damageDescription || '',
                    claimedAmount: claim.claimedAmount || '',
                    estimatedAmount: claim.estimatedAmount || '',
                    approvedAmount: claim.approvedAmount || '',
                    status: claim.status || '',
                    priority: claim.priority || '',
                    additionalNotes: claim.additionalNotes || ''
                  });
                }}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}