import { AppLanguage } from '../../common/enums';

export interface OtpEmail {
  subject: string;
  text: string;
  html: string;
}

interface Copy {
  brand: string;
  subject: string;
  title: string;
  hello: string;
  intro: string;
  ttl: string;
  ignore: string;
  rights: string;
}

const COPY: Record<AppLanguage, Copy> = {
  [AppLanguage.UK]: {
    brand: 'Книжка турботи',
    subject: 'Код підтвердження пошти — Книжка турботи',
    title: 'Підтвердження пошти',
    hello: 'Вітаємо!',
    intro: 'Щоб підтвердити цю пошту й увійти в застосунок, введіть код:',
    ttl: 'Код діє 5 хвилин і спрацьовує лише один раз.',
    ignore:
      'Якщо ви не входили в застосунок, просто проігноруйте цей лист — без коду ніхто не зайде.',
    rights: 'Усі права захищено.',
  },
  [AppLanguage.RU]: {
    brand: 'Книжка заботы',
    subject: 'Код подтверждения почты — Книжка заботы',
    title: 'Подтверждение почты',
    hello: 'Здравствуйте!',
    intro: 'Чтобы подтвердить эту почту и войти в приложение, введите код:',
    ttl: 'Код действует 5 минут и срабатывает только один раз.',
    ignore:
      'Если вы не входили в приложение, просто проигнорируйте это письмо — без кода никто не войдет.',
    rights: 'Все права защищены.',
  },
  [AppLanguage.PL]: {
    brand: 'Książeczka troski',
    subject: 'Kod potwierdzenia e-maila — Książeczka troski',
    title: 'Potwierdzenie e-maila',
    hello: 'Dzień dobry!',
    intro: 'Aby potwierdzić ten adres i zalogować się do aplikacji, wpisz kod:',
    ttl: 'Kod jest ważny 5 minut i działa tylko raz.',
    ignore:
      'Jeśli to nie Ty logowałeś się do aplikacji, zignoruj tę wiadomość — bez kodu nikt się nie zaloguje.',
    rights: 'Wszelkie prawa zastrzeżone.',
  },
  [AppLanguage.EN]: {
    brand: 'Care Journal',
    subject: 'Your email confirmation code — Care Journal',
    title: 'Confirm your email',
    hello: 'Hello!',
    intro: 'To confirm this email and sign in to the app, enter the code:',
    ttl: 'The code is valid for 5 minutes and works only once.',
    ignore:
      'If you did not try to sign in, just ignore this email — nobody can sign in without the code.',
    rights: 'All rights reserved.',
  },
};

/**
 * Лист із кодом підтвердження пошти (реєстрація й кожен вхід): шапка бренду, великий код у плашці, футер.
 * Таблична верстка й інлайн-стилі — коректно в Gmail, Outlook, Apple Mail. Без посилань і картинок —
 * менше шансів потрапити в «Спам». Обов'язково є текстова версія.
 */
export function otpEmail(language: AppLanguage, code: string): OtpEmail {
  const c = COPY[language] ?? COPY[AppLanguage.UK];
  const year = new Date().getFullYear();
  return {
    subject: c.subject,
    text: `${c.hello}\n\n${c.intro} ${code}\n\n${c.ttl}\n${c.ignore}\n\n© ${year} ${c.brand}`,
    html: `<!doctype html>
<html lang="${language}">
<body style="margin:0;padding:0;background:#EFF3EF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF3EF;padding:32px 12px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#16261F;padding:18px 24px;text-align:center;">
        <div style="font-size:20px;font-weight:700;color:#CDEFD8;">💚 ${c.brand}</div>
      </td></tr>
      <tr><td style="padding:28px 24px 8px;">
        <div style="font-size:20px;font-weight:700;color:#16261F;margin-bottom:12px;">${c.title}</div>
        <div style="font-size:16px;color:#25241C;margin-bottom:6px;">${c.hello}</div>
        <div style="font-size:15px;color:#5B5A4C;margin-bottom:20px;">${c.intro}</div>
        <div style="background:#E3F4E8;border:1px solid #BFE3CA;border-radius:10px;color:#16261F;font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;padding:14px 0;">${code}</div>
        <div style="font-size:14px;color:#5B5A4C;margin-top:18px;">${c.ttl}</div>
        <div style="font-size:13px;color:#888780;margin-top:14px;">${c.ignore}</div>
      </td></tr>
      <tr><td style="padding:16px 24px;text-align:center;font-size:12px;color:#5B5A4C;border-top:1px solid #E6ECE6;">
        © ${year} ${c.brand}. ${c.rights}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
  };
}
