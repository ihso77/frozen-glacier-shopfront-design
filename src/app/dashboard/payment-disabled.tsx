import React from 'react';

const PaymentDisabled = () => {
    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>الدفع معطل مؤقتا</h1>
            <p>نعتذر، ولكن جميع ميزات الدفع معطلة حاليا لأغراض الاختبار.</p>
            <button disabled style={{ padding: '10px 20px', fontSize: '16px', cursor: 'not-allowed' }}>دفع</button>
        </div>
    );
};

export default PaymentDisabled;