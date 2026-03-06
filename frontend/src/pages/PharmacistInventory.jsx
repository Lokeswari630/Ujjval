import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { pharmacistAPI } from '../services/api';

const PharmacistInventory = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState({
    allInventory: [],
    lowStock: []
  });
  const [loading, setLoading] = useState(true);
  const [addStockModal, setAddStockModal] = useState({
    isOpen: false,
    name: '',
    stock: '',
    minStockLevel: '',
    brand: '',
    category: '',
    dosage: '',
    form: '',
    packageSize: '1',
    unit: '',
    price: '',
    costPrice: '',
    manufacturer: ''
  });
  const [editingItemId, setEditingItemId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allInventory, lowStockInventory] = await Promise.all([
        pharmacistAPI.getInventory({}),
        pharmacistAPI.getInventory({ lowStock: true })
      ]);

      console.log('Raw all inventory response:', allInventory);
      console.log('Raw low stock inventory response:', lowStockInventory);

      const allInventoryItems = allInventory?.data?.medicines?.map((med) => ({
        id: med._id,
        name: med.name,
        stock: med.stock,
        minLevel: med.minStockLevel,
        brand: med.brand,
        category: med.category,
        dosage: med.dosage,
        form: med.form,
        packageSize: med.packageSize,
        unit: med.unit,
        price: med.price,
        isActive: med.isActive,
        expiryDate: med.expiryDate
      })) || [];

      const lowStockFromInventory = lowStockInventory?.data?.medicines?.map((med) => ({
        id: med._id,
        name: med.name,
        stock: med.stock,
        minLevel: med.minStockLevel
      })) || [];

      console.log('Processed all inventory items:', allInventoryItems);
      console.log('Processed low stock items:', lowStockFromInventory);

      setData({
        allInventory: allInventoryItems,
        lowStock: lowStockFromInventory
      });
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (item) => {
    if (!item?.id) {
      alert('Inventory item ID is missing for this medicine.');
      return;
    }
    
    // Toggle editing state for this item
    if (editingItemId === item.id) {
      setEditingItemId(null);
    } else {
      setEditingItemId(item.id);
    }
  };

  const handleInlineAddStock = async (itemId, quantity) => {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }
    
    try {
      console.log('Adding stock to item:', itemId, 'quantity:', quantity);
      
      const response = await pharmacistAPI.updateInventoryStock(itemId, {
        quantity: quantity,
        operation: 'add',
        reason: 'Manual restock from inventory page'
      });
      
      console.log('Stock update response:', response);
      
      await loadData();
      alert(`Successfully added ${quantity} units to inventory item`);
      setEditingItemId(null);
    } catch (error) {
      console.error('Error restocking item:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        alert('Inventory item not found. The item ID may be invalid.');
      } else if (error.response?.status === 400) {
        alert('Invalid request: ' + (error.response?.data?.message || 'Please check your input'));
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Authentication error. Please log in again.');
      } else {
        alert('Failed to restock item. Please try again. Error: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleAddStock = () => {
    setAddStockModal({
      isOpen: true,
      name: '',
      stock: '',
      minStockLevel: '',
      brand: 'Generic',
      category: 'general',
      dosage: 'Standard',
      form: 'tablet',
      packageSize: '1',
      unit: 'tablets',
      price: '0'
    });
  };

  const closeAddStockModal = () => {
    setAddStockModal({
      isOpen: false,
      name: '',
      stock: '',
      minStockLevel: '',
      brand: '',
      category: '',
      dosage: '',
      form: '',
      packageSize: '',
      unit: '',
      price: '',
      costPrice: '',
      manufacturer: ''
    });
  };

  const submitAddStock = async () => {
    console.log('submitAddStock called with modal data:', addStockModal);
    
    // Required fields validation
    if (!addStockModal.name || !addStockModal.stock || !addStockModal.minStockLevel || 
        !addStockModal.brand || !addStockModal.category || !addStockModal.form || 
        !addStockModal.unit || !addStockModal.price) {
      alert('Please fill in all required fields (Name, Brand, Category, Form, Unit, Stock, Minimum Stock Level, and Unit Price)');
      return;
    }

    const stock = Number(addStockModal.stock);
    const minStockLevel = Number(addStockModal.minStockLevel);
    const price = Number(addStockModal.price);
    const costPrice = Number(addStockModal.costPrice) || (price * 0.7);

    if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(minStockLevel) || minStockLevel < 0 || 
        !Number.isFinite(price) || price < 0 || !Number.isFinite(costPrice) || costPrice < 0) {
      alert('Please enter valid positive numbers for all numeric fields');
      return;
    }

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You are not authenticated. Please log in again.');
        return;
      }
      
      console.log('User is authenticated with token:', token.substring(0, 20) + '...');

      const medicineData = {
        name: addStockModal.name,
        stock: stock,
        minStockLevel: minStockLevel,
        brand: addStockModal.brand,
        category: addStockModal.category,
        dosage: addStockModal.dosage || 'Standard',
        form: addStockModal.form,
        packageSize: Number(addStockModal.packageSize) || 1,
        unit: addStockModal.unit,
        price: price,
        costPrice: costPrice,
        manufacturer: addStockModal.manufacturer || addStockModal.brand
      };

      console.log('Sending medicine data:', medicineData);
      
      const response = await pharmacistAPI.addMedicine(medicineData);
      console.log('Medicine added successfully:', response);
      
      alert(`Medicine "${addStockModal.name}" added to inventory successfully!`);
      await loadData();
      closeAddStockModal();
    } catch (error) {
      console.error('Error adding medicine:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid medicine data. Please check your input.';
        alert('Validation Error: ' + errorMessage);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Authentication Error: Please log in again.');
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login
        window.location.href = '/login';
      } else if (error.response?.status === 404) {
        alert('Endpoint Error: The add medicine endpoint was not found. Please check the server configuration.');
      } else {
        alert('Network Error: Failed to add medicine. Please check your connection and try again.\nError: ' + (error.message || 'Unknown error'));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50/60">
        <div className="h-10 w-10 rounded-full border-b-2 border-sky-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/60 via-white to-slate-100/60">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-sky-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/pharmacist" className="text-slate-400 hover:text-sky-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-slate-900">Inventory Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">Pharmacist {user?.name}</span>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Full Inventory List */}
          <div className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-sky-100 bg-sky-50/40 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">All Inventory Items</h3>
              <Button size="sm" onClick={handleAddStock}>Add New Medicine</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Medicine Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Form
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Package Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Cost Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Min Units
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Remaining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {data.allInventory.length > 0 ? (
                    data.allInventory.map((item, index) => (
                      <tr key={index} className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                          {item.expiryDate && (
                            <div className="text-xs text-slate-500">
                              Expires: {new Date(item.expiryDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.brand}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-sky-100 text-sky-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.form}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.packageSize}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          ${item.price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          ${((item.price || 0) * 0.7).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.minLevel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{item.stock}</div>
                          <div className="text-xs text-slate-500">
                            {item.stock >= item.minLevel * 2 ? 'Good' : 
                             item.stock >= item.minLevel ? 'Low' : 'Critical'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.stock <= item.minLevel 
                              ? 'bg-red-100 text-red-800' 
                              : item.stock <= item.minLevel * 2 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.stock <= item.minLevel ? 'Low Stock' : 
                             item.stock <= item.minLevel * 2 ? 'Medium' : 'Good'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editingItemId === item.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                className="w-16 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    const quantity = parseInt(e.target.value);
                                    if (Number.isFinite(quantity) && quantity > 0) {
                                      handleInlineAddStock(item.id, quantity);
                                    }
                                  }
                                }}
                              />
                              <button
                                className="px-2 py-1 bg-sky-600 text-white rounded text-xs hover:bg-sky-700"
                                onClick={(event) => {
                                  const input = event.target.parentElement.querySelector('input');
                                  const quantity = parseInt(input.value);
                                  if (Number.isFinite(quantity) && quantity > 0) {
                                    handleInlineAddStock(item.id, quantity);
                                  }
                                }}
                              >
                                Add
                              </button>
                              <button
                                className="px-2 py-1 bg-slate-500 text-white rounded text-xs hover:bg-slate-600"
                                onClick={() => setEditingItemId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => handleRestock(item)}>Restock</Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="12" className="px-6 py-8 text-center text-slate-500">
                        <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p>No medicines in inventory</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-sky-100 bg-sky-50/40 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Low Stock Alerts</h3>
              <span className="text-sm text-slate-600">
                {data.lowStock.length} items need restocking
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {data.lowStock.length > 0 ? (
                data.lowStock.map((item, index) => (
                  <div key={index} className="p-4 hover:bg-sky-50/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-600">
                          Current: {item.stock} | Minimum: {item.minLevel}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                          Critical
                        </span>
                        {editingItemId === item.id ? (
                          <>
                            <input
                              type="number"
                              min="1"
                              placeholder="Add quantity"
                              className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 mr-2"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const quantity = parseInt(e.target.value);
                                  if (Number.isFinite(quantity) && quantity > 0) {
                                    handleInlineAddStock(item.id, quantity);
                                  }
                                }
                              }}
                            />
                            <button
                              className="px-3 py-1 bg-sky-600 text-white rounded text-sm hover:bg-sky-700"
                              onClick={(event) => {
                                const input = event.target.parentElement.querySelector('input');
                                const quantity = parseInt(input.value);
                                if (Number.isFinite(quantity) && quantity > 0) {
                                  handleInlineAddStock(item.id, quantity);
                                }
                              }}
                            >
                              Add
                            </button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => handleRestock(item)}>Restock</Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p>All medicines are in stock</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Modal
        isOpen={addStockModal.isOpen}
        onClose={closeAddStockModal}
        title="Add New Medicine"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="medicine-name"
              label="Medicine Name *"
              value={addStockModal.name}
              onChange={(e) => setAddStockModal(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter medicine name"
            />
            <Input
              id="brand"
              label="Brand *"
              value={addStockModal.brand}
              onChange={(e) => setAddStockModal(prev => ({ ...prev, brand: e.target.value }))}
              placeholder="Enter brand name"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={addStockModal.category}
                onChange={(e) => setAddStockModal(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select category</option>
                <option value="general">General</option>
                <option value="antibiotics">Antibiotics</option>
                <option value="pain_relief">Pain Relief</option>
                <option value="cardiovascular">Cardiovascular</option>
                <option value="respiratory">Respiratory</option>
                <option value="gastrointestinal">Gastrointestinal</option>
                <option value="dermatological">Dermatological</option>
                <option value="endocrine">Endocrine</option>
                <option value="neurological">Neurological</option>
                <option value="vitamins">Vitamins</option>
                <option value="emergency">Emergency</option>
                <option value="chronic">Chronic</option>
                <option value="pediatric">Pediatric</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Form *</label>
              <select
                value={addStockModal.form}
                onChange={(e) => setAddStockModal(prev => ({ ...prev, form: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select form</option>
                <option value="tablet">Tablet</option>
                <option value="capsule">Capsule</option>
                <option value="syrup">Syrup</option>
                <option value="injection">Injection</option>
                <option value="ointment">Ointment</option>
                <option value="inhaler">Inhaler</option>
                <option value="drops">Drops</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="initial-stock"
              label="Initial Stock Quantity *"
              type="number"
              value={addStockModal.stock}
              onChange={(e) => setAddStockModal(prev => ({ ...prev, stock: e.target.value }))}
              placeholder="Enter initial stock quantity"
            />
            <Input
              id="min-stock-level"
              label="Minimum Stock Level *"
              type="number"
              value={addStockModal.minStockLevel}
              onChange={(e) => setAddStockModal(prev => ({ ...prev, minStockLevel: e.target.value }))}
              placeholder="Enter minimum stock level"
            />
            <Input
              id="package-size"
              label="Package Size"
              type="number"
              value={addStockModal.packageSize}
              onChange={(e) => setAddStockModal(prev => ({ ...prev, packageSize: e.target.value }))}
              placeholder="Enter package size"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
              <select
                value={addStockModal.unit}
                onChange={(e) => setAddStockModal(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select unit</option>
                <option value="tablets">Tablets</option>
                <option value="capsules">Capsules</option>
                <option value="ml">ML</option>
                <option value="mg">MG</option>
                <option value="g">Grams</option>
                <option value="pieces">Pieces</option>
              </select>
            </div>
            
            <Input
              id="unit-price"
              label="Unit Price ($) *"
              type="number"
              step="0.01"
              min="0"
              value={addStockModal.price}
              onChange={(e) => setAddStockModal(prev => ({ ...prev, price: e.target.value }))}
              placeholder="Enter unit price"
            />
            
            <Input
              id="cost-price"
              label="Cost Price ($)"
              type="number"
              step="0.01"
              min="0"
              value={addStockModal.costPrice || (Number(addStockModal.price) * 0.7).toFixed(2)}
              onChange={(e) => setAddStockModal(prev => ({ ...prev, costPrice: e.target.value }))}
              placeholder="Enter cost price"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="dosage"
              label="Dosage"
              value={addStockModal.dosage}
              onChange={(e) => setAddStockModal(prev => ({ ...prev, dosage: e.target.value }))}
              placeholder="Enter dosage (e.g., 500mg, 5ml)"
            />
            <Input
              id="manufacturer"
              label="Manufacturer"
              value={addStockModal.manufacturer || ''}
              onChange={(e) => setAddStockModal(prev => ({ ...prev, manufacturer: e.target.value }))}
              placeholder="Enter manufacturer name"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={closeAddStockModal}>
              Cancel
            </Button>
            <Button onClick={submitAddStock}>
              Add Medicine
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PharmacistInventory;