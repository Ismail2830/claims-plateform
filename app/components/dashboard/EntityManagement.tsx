'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  userAPI, 
  clientAPI, 
  policyAPI, 
  claimAPI,
  type User,
  type Client,
  type Policy,
  type Claim,
  type PaginatedResponse 
} from '../../lib/api/superAdminAPI';
import ClaimDetailsModal from './ClaimDetailsModal';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { 
  Users, 
  UserPlus, 
  Shield, 
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';

interface EntityManagementProps {
  activeEntityTab: string;
  setActiveEntityTab: (tab: string) => void;
  systemStats?: any;
}

const EntityManagement: React.FC<EntityManagementProps> = ({ activeEntityTab, setActiveEntityTab, systemStats }) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');

  // Claim Details Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Entity data states
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [clients, setClients] = useState<PaginatedResponse<Client> | null>(null);
  const [policies, setPolicies] = useState<PaginatedResponse<Policy> | null>(null);
  const [claims, setClaims] = useState<PaginatedResponse<Claim> | null>(null);

  // Real-time updates for current entity
  const getEntityType = (tab: string): 'USER' | 'CLIENT' | 'POLICY' | 'CLAIM' => {
    switch (tab) {
      case 'users': return 'USER';
      case 'clients': return 'CLIENT';
      case 'policies': return 'POLICY';
      case 'claims': return 'CLAIM';
      default: return 'USER';
    }
  };
  
  const { events: entityEvents } = useRealTimeUpdates({
    entityTypes: [getEntityType(activeEntityTab)]
  });

  // Helper function to get count for each entity tab
  const getEntityCount = (entityKey: string) => {
    if (!systemStats) return 0;
    
    switch (entityKey) {
      case 'users':
        return systemStats.users?.total || 0;
      case 'clients':
        return systemStats.clients?.stats?.find((s: any) => s.status === 'ACTIVE')?._count || 0;
      case 'policies':
        return systemStats.policies?.stats?.filter((s: any) => s.status === 'ACTIVE').reduce((sum: number, s: any) => sum + s._count, 0) || 0;
      case 'claims':
        return systemStats.claims?.stats?.filter((s: any) => !['CLOSED', 'REJECTED'].includes(s.status)).reduce((sum: number, s: any) => sum + s._count, 0) || 0;
      default:
        return 0;
    }
  };

  const entityTabs = [
    { key: 'users', name: 'Users', icon: Users, color: 'blue' },
    { key: 'clients', name: 'Clients', icon: UserPlus, color: 'green' },
    { key: 'policies', name: 'Policies', icon: Shield, color: 'indigo' },
    { key: 'claims', name: 'Claims', icon: FileText, color: 'red' },
  ];

  // Load data based on active tab
  const loadEntityData = useCallback(async (refresh = false) => {
    if (refresh) {
      setCurrentPage(1);
      setSelectedItems([]);
    }
    
    setLoading(true);
    try {
      const options = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        status: filterStatus || undefined,
      };

      switch (activeEntityTab) {
        case 'users':
          const userOptions = {
            ...options,
            status: filterStatus ? (filterStatus as 'active' | 'inactive') : undefined,
          };
          const usersData = await userAPI.list(userOptions);
          setUsers(usersData);
          break;
        case 'clients':
          const clientsData = await clientAPI.list(options);
          setClients(clientsData);
          break;
        case 'policies':
          const policiesData = await policyAPI.list(options);
          setPolicies(policiesData);
          break;
        case 'claims':
          const claimsData = await claimAPI.list(options);
          setClaims(claimsData);
          break;
      }
    } catch (error) {
      console.error('Error loading entity data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeEntityTab, currentPage, searchTerm, filterStatus]);

  // Load data when tab changes or filters change
  useEffect(() => {
    loadEntityData();
  }, [loadEntityData]);

  // Refresh data when real-time events occur
  useEffect(() => {
    if (entityEvents.length > 0) {
      const latestEvent = entityEvents[entityEvents.length - 1];
      if (['entity_created', 'entity_updated', 'entity_deleted', 'bulk_operation'].includes(latestEvent.type)) {
        setTimeout(loadEntityData, 500); // Debounced refresh
      }
    }
  }, [entityEvents, loadEntityData]);

  const handleTabChange = (tabKey: string) => {
    setActiveEntityTab(tabKey);
    setSelectedItems([]);
    setCurrentPage(1);
    setSearchTerm('');
    setFilterStatus('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadEntityData();
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) return;

    setLoading(true);
    try {
      let result;
      switch (activeEntityTab) {
        case 'users':
          result = await userAPI.bulkAction(action, selectedItems);
          break;
        case 'clients':
          result = await clientAPI.bulkAction(action, selectedItems);
          break;
        case 'policies':
          result = await policyAPI.bulkAction(action, selectedItems);
          break;
        case 'claims':
          result = await claimAPI.bulkAction(action, selectedItems);
          break;
      }
      
      if (result?.success) {
        setSelectedItems([]);
        loadEntityData();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    setLoading(true);
    try {
      let result;
      switch (activeEntityTab) {
        case 'users':
          result = await userAPI.create(data);
          break;
        case 'clients':
          result = await clientAPI.create(data);
          break;
        case 'policies':
          result = await policyAPI.create(data);
          break;
        case 'claims':
          result = await claimAPI.create(data);
          break;
      }
      
      if (result?.success) {
        setShowCreateModal(false);
        loadEntityData();
      }
    } catch (error) {
      console.error('Error creating entity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (item: any) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleUpdate = async (id: string, data: any) => {
    setLoading(true);
    try {
      let result;
      switch (activeEntityTab) {
        case 'users':
          result = await userAPI.update(id, data);
          break;
        case 'clients':
          result = await clientAPI.update(id, data);
          break;
        case 'policies':
          result = await policyAPI.update(id, data);
          break;
        case 'claims':
          result = await claimAPI.update(id, data);
          break;
      }
      
      if (result?.success) {
        setShowEditModal(false);
        setEditingItem(null);
        loadEntityData();
      }
    } catch (error) {
      console.error('Error updating entity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Are you sure you want to delete ${item.name || item.email || item.policyNumber || item.claimNumber}?`)) {
      return;
    }

    setLoading(true);
    try {
      let result;
      const id = item.userId || item.clientId || item.policyId || item.claimId;
      
      switch (activeEntityTab) {
        case 'users':
          result = await userAPI.delete(id);
          break;
        case 'clients':
          result = await clientAPI.delete(id);
          break;
        case 'policies':
          result = await policyAPI.delete(id);
          break;
        case 'claims':
          result = await claimAPI.delete(id);
          break;
      }
      
      if (result?.success) {
        loadEntityData();
      }
    } catch (error) {
      console.error('Error deleting entity:', error);
    } finally {
      setLoading(false);
    }
  };

  // Claim Modal Handlers
  const handleViewClaimDetails = (claim: any) => {
    setSelectedClaim(claim);
    setShowClaimModal(true);
  };

  const handleClaimUpdate = async (claimId: string, data: any) => {
    try {
      const result = await claimAPI.update(claimId, data);
      if (result?.success) {
        loadEntityData(); // Refresh the claims list
        // Update the selected claim with new data
        const updatedClaim = { ...selectedClaim, ...data };
        setSelectedClaim(updatedClaim);
      }
    } catch (error) {
      console.error('Error updating claim:', error);
      throw error;
    }
  };

  const handleClaimDelete = async (claimId: string) => {
    try {
      const result = await claimAPI.delete(claimId);
      if (result?.success) {
        loadEntityData(); // Refresh the claims list
        setShowClaimModal(false);
        setSelectedClaim(null);
      }
    } catch (error) {
      console.error('Error deleting claim:', error);
      throw error;
    }
  };

  const getCurrentData = () => {
    switch (activeEntityTab) {
      case 'users': return users?.data?.users || [];
      case 'clients': return clients?.data?.clients || [];
      case 'policies': return policies?.data?.policies || [];
      case 'claims': return claims?.data?.claims || [];
      default: return [];
    }
  };

  const getCurrentPagination = () => {
    switch (activeEntityTab) {
      case 'users': return users?.data?.pagination;
      case 'clients': return clients?.data?.pagination;
      case 'policies': return policies?.data?.pagination;
      case 'claims': return claims?.data?.pagination;
      default: return null;
    }
  };

  const renderEntityTable = () => {
    const data = getCurrentData();
    const pagination = getCurrentPagination();

    if (loading && data.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading {activeEntityTab}...</span>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No {activeEntityTab} found</div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create First {activeEntityTab.slice(0, -1)}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Entity Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    checked={selectedItems.length === data.length && data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const ids = data.map((item: any) => 
                          item.userId || item.clientId || item.policyId || item.claimId
                        );
                        setSelectedItems(ids);
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </th>
                {renderTableHeaders()}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item: any, index: number) => {
                const uniqueId = `${item.userId || item.clientId || item.policyId || item.claimId}-${index}`;
                return renderTableRow(item, uniqueId);
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                  }
                }}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => {
                  if (currentPage < pagination.pages) {
                    setCurrentPage(currentPage + 1);
                  }
                }}
                disabled={currentPage === pagination.pages}
                className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTableHeaders = () => {
    switch (activeEntityTab) {
      case 'users':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workload</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </>
        );
      case 'clients':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policies</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </>
        );
      case 'policies':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </>
        );
      case 'claims':
        return (
          <>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </>
        );
      default:
        return null;
    }
  };

  const renderTableRow = (item: any, uniqueId?: string) => {
    const id = item.userId || item.clientId || item.policyId || item.claimId;
    const rowKey = uniqueId || id;
    
    return (
      <tr key={rowKey} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <input 
            type="checkbox" 
            className="rounded border-gray-300"
            checked={selectedItems.includes(id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedItems([...selectedItems, id]);
              } else {
                setSelectedItems(selectedItems.filter(selectedId => selectedId !== id));
              }
            }}
          />
        </td>
        {renderTableColumns(item)}
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
          {activeEntityTab === 'claims' ? (
            <div className="flex space-x-2">
              <button 
                onClick={() => handleViewClaimDetails(item)}
                className="text-blue-600 hover:text-blue-900"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleEdit(item)}
                className="text-indigo-600 hover:text-indigo-900"
                title="Quick Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(item)}
                className="text-red-600 hover:text-red-900"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => handleEdit(item)}
                className="text-blue-600 hover:text-blue-900"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(item)}
                className="text-red-600 hover:text-red-900"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </td>
      </tr>
    );
  };

  const renderTableColumns = (item: any) => {
    switch (activeEntityTab) {
      case 'users':
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap">
              <div>
                <div className="text-sm font-medium text-gray-900">{item.firstName} {item.lastName}</div>
                <div className="text-sm text-gray-500">{item.email}</div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                item.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                item.role === 'MANAGER_SENIOR' ? 'bg-indigo-100 text-indigo-800' :
                item.role === 'MANAGER_JUNIOR' ? 'bg-blue-100 text-blue-800' :
                item.role === 'EXPERT' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.role}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {item.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {item.currentWorkload} / {item.maxWorkload}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {item.lastLogin ? new Date(item.lastLogin).toLocaleDateString() : 'Never'}
            </td>
          </>
        );
      case 'clients':
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap">
              <div>
                <div className="text-sm font-medium text-gray-900">{item.firstName} {item.lastName}</div>
                <div className="text-sm text-gray-500">{item.email}</div>
                <div className="text-sm text-gray-500">{item.phone}</div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                item.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {item.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex space-x-1">
                {item.emailVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                {item.phoneVerified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                {item.documentVerified && <CheckCircle className="w-4 h-4 text-purple-500" />}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {item._count?.policies || 0}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                parseFloat(item.riskScore || '0') > 0.7 ? 'bg-red-100 text-red-800' :
                parseFloat(item.riskScore || '0') > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {(parseFloat(item.riskScore || '0') * 100).toFixed(0)}%
              </span>
            </td>
          </>
        );
      case 'policies':
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap">
              <div>
                <div className="text-sm font-medium text-gray-900">{item.policyNumber}</div>
                <div className="text-sm text-gray-500">Premium: MAD {item.premiumAmount?.toLocaleString()}</div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">
                {item.client ? `${item.client.firstName} ${item.client.lastName}` : 'N/A'}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.policyType}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              MAD {item.insuredAmount?.toLocaleString()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                item.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {item.status}
              </span>
            </td>
          </>
        );
      case 'claims':
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap">
              <div>
                <div className="text-sm font-medium text-gray-900">{item.claimNumber}</div>
                <div className="text-sm text-gray-500">{new Date(item.declarationDate).toLocaleDateString()}</div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">
                {item.client ? `${item.client.firstName} ${item.client.lastName}` : 'N/A'}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.claimType}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              MAD {item.claimedAmount?.toLocaleString() || 'N/A'}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                item.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                item.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                item.status === 'DECLARED' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {item.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {item.assignedUser ? 
                `${item.assignedUser.firstName} ${item.assignedUser.lastName}` : 
                'Unassigned'
              }
            </td>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {entityTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeEntityTab === tab.key
                  ? `bg-${tab.color}-600 text-white shadow-sm`
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                activeEntityTab === tab.key ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {getEntityCount(tab.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-1 items-center space-x-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={`Search ${activeEntityTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            {activeEntityTab === 'users' && (
              <>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </>
            )}
            {activeEntityTab === 'clients' && (
              <>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </>
            )}
            {(activeEntityTab === 'policies' || activeEntityTab === 'claims') && (
              <>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </>
            )}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedItems.length} selected
              </span>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                Delete
              </button>
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                Activate
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={() => loadEntityData(true)}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Create {activeEntityTab.slice(0, -1)}</span>
          </button>
        </div>
      </div>

      {/* Real-time Updates Indicator */}
      {entityEvents.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="flex">
            <div className="shrink-0">
              <Zap className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                {entityEvents.length} real-time update{entityEvents.length > 1 ? 's' : ''} received for {activeEntityTab}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Entity Table */}
      {renderEntityTable()}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateEntityModal
          entityType={activeEntityTab}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <EditEntityModal
          entityType={activeEntityTab}
          item={editingItem}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSubmit={(data) => {
            const id = editingItem.userId || editingItem.clientId || editingItem.policyId || editingItem.claimId;
            handleUpdate(id, data);
          }}
        />
      )}

      {/* Claim Details Modal */}
      {showClaimModal && selectedClaim && (
        <ClaimDetailsModal
          claim={selectedClaim}
          isOpen={showClaimModal}
          onClose={() => {
            setShowClaimModal(false);
            setSelectedClaim(null);
          }}
          onUpdate={handleClaimUpdate}
          onDelete={handleClaimDelete}
        />
      )}
    </div>
  );
};

// Create Entity Modal with proper forms
const CreateEntityModal: React.FC<{
  entityType: string;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ entityType, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [fetchingOptions, setFetchingOptions] = useState(false);

  // Fetch clients and policies for dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      if (entityType === 'policies' || entityType === 'claims') {
        setFetchingOptions(true);
        try {
          const clientsData = await clientAPI.list({ limit: 100 });
          setClients(clientsData.data?.clients || []);
          
          if (entityType === 'claims') {
            const policiesData = await policyAPI.list({ limit: 100 });
            setPolicies(policiesData.data?.policies || []);
          }
        } catch (error) {
          console.error('Error fetching options:', error);
        } finally {
          setFetchingOptions(false);
        }
      }
    };

    fetchOptions();
  }, [entityType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Create error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (entityType.toLowerCase()) {
      case 'users':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.firstName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.lastName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.password || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.role || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                required
              >
                <option value="">Select Role</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="MANAGER_SENIOR">Senior Manager</option>
                <option value="MANAGER_JUNIOR">Junior Manager</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Workload</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.maxWorkload || 20}
                onChange={(e) => setFormData(prev => ({ ...prev, maxWorkload: parseInt(e.target.value) }))}
                min={1}
                max={100}
              />
            </div>
          </div>
        );

      case 'clients':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.cin || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cin: e.target.value }))}
                required
                placeholder="National ID Number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.dateOfBirth || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.address || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                required
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.city || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.province || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 'policies':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.clientId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                required
                disabled={fetchingOptions}
              >
                <option value="">
                  {fetchingOptions ? 'Loading clients...' : 'Select Client'}
                </option>
                {clients.map((client) => (
                  <option key={client.clientId} value={client.clientId}>
                    {client.firstName} {client.lastName} ({client.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.policyNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, policyNumber: e.target.value }))}
                required
                placeholder="e.g., POL-2026-001234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Type</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.policyType || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, policyType: e.target.value }))}
                required
              >
                <option value="">Select Type</option>
                <option value="HEALTH">Health Insurance</option>
                <option value="LIFE">Life Insurance</option>
                <option value="AUTO">Auto Insurance</option>
                <option value="HOME">Home Insurance</option>
                <option value="BUSINESS">Business Insurance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Type</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.coverageType || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, coverageType: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Premium Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.premiumAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, premiumAmount: parseFloat(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insured Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.insuredAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuredAmount: parseFloat(e.target.value) }))}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 'claims':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.clientId || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, clientId: e.target.value, policyId: '' }));
                }}
                required
                disabled={fetchingOptions}
              >
                <option value="">
                  {fetchingOptions ? 'Loading clients...' : 'Select Client'}
                </option>
                {clients.map((client) => (
                  <option key={client.clientId} value={client.clientId}>
                    {client.firstName} {client.lastName} ({client.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.policyId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, policyId: e.target.value }))}
                required
                disabled={fetchingOptions || !formData.clientId}
              >
                <option value="">
                  {fetchingOptions ? 'Loading policies...' : 
                   !formData.clientId ? 'Select client first' : 
                   'Select Policy'}
                </option>
                {policies
                  .filter(policy => !formData.clientId || policy.clientId === formData.clientId)
                  .map((policy) => (
                    <option key={policy.policyId} value={policy.policyId}>
                      {policy.policyNumber} - {policy.policyType}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Number</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.claimNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, claimNumber: e.target.value }))}
                required
                placeholder="e.g., CLM-2026-001234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.claimType || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, claimType: e.target.value }))}
                required
              >
                <option value="">Select Type</option>
                <option value="HEALTH">Health Claim</option>
                <option value="ACCIDENT">Accident Claim</option>
                <option value="PROPERTY">Property Claim</option>
                <option value="LIABILITY">Liability Claim</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Declaration Date</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.declarationDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, declarationDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claimed Amount</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.claimedAmount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, claimedAmount: parseFloat(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.priority || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                required
              >
                <option value="">Select Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
                rows={4}
                placeholder="Describe the incident and claim details..."
              />
            </div>
          </div>
        );

      default:
        return (
          <p className="text-gray-600 mb-4">
            Form not implemented for {entityType}
          </p>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Create New {entityType.slice(0, -1)}</h3>
        <form onSubmit={handleSubmit}>
          {renderForm()}
          <div className="flex space-x-2 mt-6 pt-4 border-t">
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditEntityModal: React.FC<{
  entityType: string;
  item: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ entityType, item, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Record<string, any>>(item);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (entityType.toLowerCase()) {
      case 'users':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.firstName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.lastName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.role || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                required
              >
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="MANAGER_SENIOR">Senior Manager</option>
                <option value="MANAGER_JUNIOR">Junior Manager</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Workload</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.maxWorkload || 20}
                onChange={(e) => setFormData(prev => ({ ...prev, maxWorkload: parseInt(e.target.value) }))}
                min={1}
                max={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <p className="text-gray-600 mb-4">
            Edit form not implemented for {entityType}
          </p>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Edit {entityType.slice(0, -1)}</h3>
        <form onSubmit={handleSubmit}>
          {renderForm()}
          <div className="flex space-x-2 mt-6 pt-4 border-t">
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntityManagement;