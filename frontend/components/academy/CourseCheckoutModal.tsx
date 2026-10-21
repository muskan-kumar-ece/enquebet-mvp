'use client';

import React, { useState } from 'react';
import { Course } from '@/types/academy';
import { api } from '@/lib/api';
import {
  X,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Loader2,
  Sparkles,
  CreditCard,
  QrCode,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface CourseCheckoutModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CourseCheckoutModal({
  course,
  isOpen,
  onClose,
  onSuccess,
}: CourseCheckoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');

  if (!isOpen) return null;

  const price = course.price_inr || 0;
  const basePrice = Math.round(price / 1.18);
  const gst = price - basePrice;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Create order on backend
      const orderData = await api.createCourseOrder(course.slug, {
        billing_name: billingName,
        billing_email: billingEmail,
      });

      // 2. Check if we are running in simulation/sandbox or live Razorpay
      const isSimulated = orderData.gateway === 'simulation' || orderData.gateway_order_id.startsWith('sim_');

      if (isSimulated) {
        // Fast-path simulated fulfillment for dev/test environments
        const settleRes = await api.verifyCoursePayment(course.slug, {
          order_number: orderData.order_number,
          gateway_payment_id: `sim_pay_${Date.now()}`,
          gateway_signature: 'sim_sig_verified',
        });

        if (settleRes.status === 'paid') {
          setPaymentSuccess(true);
          setTimeout(() => {
            onSuccess();
          }, 1800);
        } else {
          throw new Error('Simulation settlement failed.');
        }
        return;
      }

      // 3. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Unable to load secure payment gateway. Please check your network connection.');
      }

      // 4. Open Razorpay Standard Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount_paise,
        currency: orderData.currency,
        name: 'ENQUEbet Academy',
        description: `Enrollment: ${course.title}`,
        order_id: orderData.gateway_order_id,
        prefill: {
          name: billingName || undefined,
          email: billingEmail || undefined,
        },
        theme: {
          color: '#10B981', // Emerald brand
        },
        handler: async (response: any) => {
          try {
            // 5. Verify cryptographic signature on backend
            await api.verifyCoursePayment(course.slug, {
              order_number: orderData.order_number,
              gateway_payment_id: response.razorpay_payment_id,
              gateway_signature: response.razorpay_signature,
            });
            setPaymentSuccess(true);
            setTimeout(() => {
              onSuccess();
            }, 1800);
          } catch (err: any) {
            setError(err?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setError(response.error.description || 'Payment was declined by your bank.');
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate purchase. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-surface-base border border-border-default shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border-default/80 flex items-center justify-between bg-surface-elevated/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Unlock Premium Specialization</h3>
              <p className="text-xs text-text-muted">Lifetime access with capstone code review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            type="button"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary bg-surface-elevated hover:bg-surface-elevated/80 border border-border-default transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {paymentSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-text-primary">Payment Successful!</h4>
              <p className="text-xs text-text-secondary max-w-xs mx-auto">
                You now hold lifetime commercial entitlement for <span className="font-semibold text-text-primary">{course.title}</span>.
              </p>
            </div>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Curriculum unlocked. Redirecting...</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Course Summary Card */}
            <div className="p-4 rounded-xl bg-surface-elevated/60 border border-border-default/80 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-lg bg-surface-base border border-border-default flex items-center justify-center shrink-0 overflow-hidden text-brand-light font-bold text-base">
                {course.title.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Premium Track
                  </span>
                  <span className="text-xs text-text-muted truncate">
                    by {course.creator?.full_name || course.creator?.username}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-text-primary truncate mt-0.5">
                  {course.title}
                </h4>
              </div>
            </div>

            {/* Included Value Props */}
            <div className="space-y-2 py-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Included with Lifetime Access:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>All Private Lessons</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Capstone Code Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Starter Repositories</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Verified Certificate</span>
                </div>
              </div>
            </div>

            {/* Billing Inputs */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-muted">
                    Full Name (for certificate)
                  </label>
                  <input
                    type="text"
                    value={billingName}
                    onChange={(e) => setBillingName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border-default text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-muted">
                    Email (for invoice receipt)
                  </label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="alex@domain.com"
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border-default text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-brand-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border-default/60 space-y-1.5 text-xs">
              <div className="flex justify-between text-text-muted">
                <span>Tuition (Net)</span>
                <span className="font-mono">₹{basePrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>GST (18% Included)</span>
                <span className="font-mono">₹{gst.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-border-default/60 pt-1.5 flex justify-between font-bold text-sm text-text-primary">
                <span>Total Amount Due</span>
                <span className="font-mono text-emerald-400">₹{price.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment Rails Supported */}
            <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
              <div className="flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>UPI (GPay, PhonePe, Paytm, QR)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-brand-light" />
                <span>Cards & NetBanking</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting Secure Gateway...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Pay ₹{price.toLocaleString('en-IN')} & Unlock Course</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-bit encrypted bank checkout via Razorpay</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
