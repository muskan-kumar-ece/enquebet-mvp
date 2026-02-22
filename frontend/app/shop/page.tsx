import { ShoppingCart } from 'lucide-react';

export default function ShopPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="card text-center max-w-md py-16 px-8">
                <ShoppingCart className="w-16 h-16 text-purple mx-auto mb-6" />
                <h1 className="text-3xl font-bold mb-3">Shop</h1>
                <p className="text-text-secondary mb-6">
                    Marketplace for student-created products and services is on its way.
                </p>
                <span className="pill text-sm">Coming Soon</span>
            </div>
        </div>
    );
}
