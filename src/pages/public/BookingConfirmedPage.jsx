
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../../styles/patient-public.css';
export default function BookingConfirmedPage() {
  const {state} = useLocation(); const navigate=useNavigate(); const {t,i18n}=useTranslation(); const booking=state?.booking;
  useEffect(()=>{if(!booking?.date || !booking?.time) navigate('/appointments',{replace:true,state:{missingConfirmation:true}});},[booking,navigate]);
  if(!booking?.date || !booking?.time) return null;
  const formatted=new Intl.DateTimeFormat(i18n.language.startsWith('ta')?'ta-LK':'en-LK',{dateStyle:'long',timeZone:'Asia/Colombo'}).format(new Date(`${booking.date}T12:00:00`));
  return <main className="patient-shell"><section className="patient-card"><h1>{t('confirmation.title')}</h1><dl className="patient-summary"><dt>{t('confirmation.doctor')}</dt><dd>{booking.doctor}</dd><dt>{t('confirmation.date')}</dt><dd>{formatted}</dd><dt>{t('confirmation.time')}</dt><dd>{booking.time}</dd><dt>{t('confirmation.status')}</dt><dd>{t('confirmation.scheduled')}</dd></dl><p>{t('confirmation.sms')}</p><p>{t('confirmation.contact')}</p><Link to="/appointments" className="patient-button">{t('confirmation.another')}</Link></section></main>;
}
