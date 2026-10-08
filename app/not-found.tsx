import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada | Auto Lava Garcia & Antojos Bar Lounge',
  robots: { index: false, follow: true },
};

const ENLACES: Array<[string, string]> = [
  ['/', 'Inicio'],
  ['/menu.html', 'Menú de Antojos'],
  ['/servicios-lavado.html', 'Servicios y precios de lavado'],
  ['/ofertas.html', 'Ofertas'],
  ['/como-llegar.html', 'Cómo llegar'],
  ['/preguntas-frecuentes.html', 'Preguntas frecuentes'],
  ['/contacto.html', 'Contacto'],
];

export default function NotFound() {
  return (
    <>
      <link rel="stylesheet" href="/css/styles.css" />
      <header className="header">
        <nav className="nav" aria-label="Principal">
          <a href="/" className="logo">
            Auto Lava Garcia<span className="logo-accent"> &amp; Antojos</span>
          </a>
        </nav>
      </header>
      <main>
        <article className="section content-page">
          <div className="container content-prose">
            <p className="content-eyebrow">Error 404</p>
            <h1>Esta página no existe</h1>
            <p className="content-lead">
              La dirección que abrió no corresponde a ninguna página del sitio. Puede que el enlace esté mal escrito o
              que la página haya cambiado de nombre.
            </p>
            <h2>Páginas del sitio</h2>
            <ul>
              {ENLACES.map(([href, texto]) => (
                <li key={href}>
                  <a href={href}>{texto}</a>
                </li>
              ))}
            </ul>
            <p>
              Teléfono y WhatsApp del local: <a href="tel:+18097941824">+1 809-794-1824</a>
            </p>
          </div>
        </article>
      </main>
    </>
  );
}
