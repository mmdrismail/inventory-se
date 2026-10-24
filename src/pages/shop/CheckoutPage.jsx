import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Textarea, Select } from '../../components/forms/FormControls';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, CheckCircle2, ShieldCheck, Truck, CreditCard, Sparkles } from 'lucide-react';

export const CheckoutPage = () => {
  const { cart, createOrder, settings } = useAppData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: currentUser?.name || 'Farhan Kabir',
    email: currentUser?.email || 'customer@stockline.io',
    phone: '+880 1820-001122',
    deliveryAddress: 'House 14, Road 5, Mirpur DOHS, Dhaka',
    paymentMethod: 'Cash on Delivery (Simulated)',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = cart.length > 0 ? 60 : 0;
  const total = subtotal + shippingFee;

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">Your Cart is Empty</h2>
        <p className="text-xs text-slate-500">Please add products to your cart before proceeding to checkout.</p>
        <Link to="/shop">
          <Button variant="primary">Return to Catalog</Button>
        </Link>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Please provide full recipient name.';
    if (!formData.email.trim()) errs.email = 'Please provide your email address.';
    if (!formData.phone.trim()) errs.phone = 'Please provide a valid phone number.';
    if (!formData.deliveryAddress.trim()) errs.deliveryAddress = 'Delivery address is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const orderPayload = {
      customerId: currentUser?.id || 'cust-10',
      customerName: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      deliveryAddress: formData.deliveryAddress.trim(),
      paymentMethod: formData.paymentMethod,
      paymentStatus: formData.paymentMethod.includes('Cash') ? 'unpaid' : 'paid',
      notes: formData.notes?.trim() || '',
      items: cart,
      shippingFee,
    };

    setTimeout(() => {
      const res = createOrder(orderPayload);
      setIsSubmitting(false);

      if (res.success) {
        // Trigger celebratory confetti
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}

        navigate(`/my-orders/${res.order.id}`, { state: { justPlaced: true } });
      } else {
        setErrors({ form: res.message });
      }
    }, 400);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Cart</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Delivery & Simulated Payment Details</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This is a demo checkout simulation. No real credit card or payment gateway is charged.
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.form && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold">
                    {errors.form}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Recipient Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    required
                  />

                  <Input
                    label="Email Address (for Order Updates)"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Contact Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    required
                  />

                  <Select
                    label="Simulated Payment Method"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    options={[
                      { value: 'Cash on Delivery (Simulated)', label: 'Cash on Delivery (Pay on Receipt)' },
                      { value: 'Demo Online Payment', label: 'Demo Card / Instant simulated gateway' },
                      { value: 'Corporate Invoice', label: 'Simulated 30-day Corporate Credit' },
                    ]}
                  />
                </div>

                <Input
                  label="Delivery Shipping Address"
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  error={errors.deliveryAddress}
                  placeholder="Apartment, Street address, City"
                  required
                />

                <Textarea
                  label="Order Notes / Delivery Instructions"
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Gate code, landmark, or special handling notes..."
                />

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    icon={CheckCircle2}
                    isLoading={isSubmitting}
                  >
                    Place Demo Order ({formatCurrency(total, settings.currency)})
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Order Items Breakdown */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Order Items ({cart.length})
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={item.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </div>
                      <span className="text-[10px] text-slate-400">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                    {formatCurrency(item.price * item.quantity, settings.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(subtotal, settings.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Courier Delivery:</span>
                <span className="font-mono">{formatCurrency(shippingFee, settings.currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Total:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(total, settings.currency)}
                </span>
              </div>
            </div>
          </Card>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Educational Lab Simulation
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
              Your order will be logged locally and can be managed directly in the dashboard orders module.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
