"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {api} from "@/lib/payments";
import {Loader2,CheckCircle,AlertTriangle} from "lucide-react";
export default function OnboardingReturn(){
 const [state,setState]=useState({loading:true,message:"Confirming seller connection with PayPal…"});
 useEffect(()=>{const q=new URLSearchParams(window.location.search);api("/merchants/paypal/complete",{method:"POST",body:{trackingId:q.get("merchantId"),merchantIdInPayPal:q.get("merchantIdInPayPal"),permissionsGranted:q.get("permissionsGranted")==="true",consentStatus:q.get("consentStatus")==="true"}}).then(d=>setState({loading:false,ok:d.status==="connected",message:d.status==="connected"?"PayPal seller account connected. Verifee shop review may still be pending.":"PayPal account needs more verification before it can receive payments."})).catch(e=>setState({loading:false,message:e.message}))},[]);
 return <main className="vf-page min-h-screen pt-32"><div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center">{state.loading?<Loader2 className="mx-auto animate-spin"/>:state.ok?<CheckCircle className="mx-auto text-green-600" size={40}/>:<AlertTriangle className="mx-auto text-amber-600" size={40}/>}<h1 className="mt-4 text-2xl font-black">PayPal onboarding</h1><p className="mt-2 text-sm text-zinc-600">{state.message}</p><Link href="/merchant" className="mt-5 inline-block font-bold text-green-700">Return to merchant dashboard →</Link></div></main>
}
