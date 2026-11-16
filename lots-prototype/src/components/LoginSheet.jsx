import React, { useEffect, useRef, useState } from 'react';
import { Close, Heart } from './ui';

/**
 * "Log in to save lots": saving is tied to an account, so the first tap on a
 * heart (or on "Saved") asks the buyer to log in with their mobile number and
 * a one-time code, then finishes what they tapped.
 *
 * Production: the live site's existing phone OTP flow, and saved lots kept in
 * a `saved_lots` table per account, so they follow the buyer to any device.
 * Prototype: no code is sent; any 6 digits log in for this tab.
 */
export default function LoginSheet({ reason = 'save', onDone, onClose }) {
    const [step, setStep] = useState('phone'); // phone | code
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const codeRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    useEffect(() => {
        if (step === 'code') codeRef.current?.focus();
    }, [step]);

    const masked = phone ? `+91 ${phone.slice(0, 2)}••••••${phone.slice(-2)}` : '';

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Log in">
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[440px] rounded-t-[26px] md:rounded-[26px] shadow-float p-6 md:p-7">
                <span className="w-11 h-11 rounded-full bg-clay-soft text-clay grid place-items-center">
                    <Heart filled />
                </span>
                <h2 className="mt-4 font-brand text-[30px] leading-[1.05]">{reason === 'saved' ? 'Log in to see your saved lots' : 'Log in to save lots'}</h2>
                <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
                    You have to log in first, then you can save lots and come back to them any time, on any device. We use your mobile number and a one-time code; no
                    password.
                </p>

                {step === 'phone' ? (
                    <form
                        className="mt-5"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setStep('code');
                        }}
                    >
                        <label className="block">
                            <span className="text-[12px] font-semibold text-ink-3">Mobile number</span>
                            <div className="mt-1 flex h-12 rounded-xl border border-ink/15 bg-white focus-within:border-ink">
                                <span className="px-3 grid place-items-center text-[15px] text-ink-3 border-r border-ink/10">+91</span>
                                <input
                                    autoFocus
                                    required
                                    inputMode="numeric"
                                    pattern="[0-9]{10}"
                                    maxLength={10}
                                    title="10-digit mobile number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    className="flex-1 min-w-0 px-3 text-[15px] outline-none bg-transparent tracking-wide"
                                />
                            </div>
                        </label>
                        <button className="mt-4 w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">Send the code</button>
                    </form>
                ) : (
                    <form
                        className="mt-5"
                        onSubmit={(e) => {
                            e.preventDefault();
                            onDone({ phone });
                        }}
                    >
                        <label className="block">
                            <span className="text-[12px] font-semibold text-ink-3">The 6-digit code sent to {masked}</span>
                            <input
                                ref={codeRef}
                                required
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                title="6-digit code"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                className="mt-1 w-full h-12 rounded-xl border border-ink/15 bg-white px-3 text-[20px] font-bold tracking-[0.4em] outline-none focus:border-ink tabular-nums"
                            />
                        </label>
                        <button className="mt-4 w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">
                            {reason === 'saved' ? 'Log in' : 'Log in and save'}
                        </button>
                        <button type="button" onClick={() => setStep('phone')} className="mt-2 w-full text-[13px] font-bold text-ink-2 hover:text-ink">
                            Change the number
                        </button>
                    </form>
                )}
                <p className="mt-3 text-[12px] text-ink-3 text-center">Demo: no code is sent; any 6 digits work.</p>

                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 grid place-items-center shadow-sm hover:bg-white"
                >
                    <Close />
                </button>
            </div>
        </div>
    );
}
