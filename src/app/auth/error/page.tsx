'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    const isSpotify403 = error === 'OAuthCallbackError' || error === 'AccessDenied';

    return (
        <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl shadow-2xl">
            <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-white">Oops! Accès refusé</h1>

                {isSpotify403 ? (
                    <div className="space-y-4 text-zinc-400 text-sm leading-relaxed text-left bg-zinc-950/50 p-4 rounded-lg border border-zinc-800">
                        <p>
                            Il semble que ton compte Spotify ne soit pas autorisé sur l&apos;app Spotify utilisée pour te connecter.
                        </p>
                        <p className="font-medium text-zinc-300">
                            Pour régler ça :
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Connecte-toi avec le compte Spotify qui a créé l&apos;app sur le <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">Spotify Developer Dashboard</a></li>
                            <li>Ou ajoute ton adresse email Spotify dans l&apos;onglet <strong>Users and Access</strong> de cette app</li>
                            <li>Vérifie aussi que l&apos;URL de redirection de l&apos;app est exactement celle affichée sur la page de configuration</li>
                        </ul>
                    </div>
                ) : (
                    <p className="text-zinc-400">
                        Une erreur est survenue lors de la connexion. ({error || 'Unknown Error'})
                    </p>
                )}

                <div className="pt-4">
                    <Link
                        href="/setup"
                        className="inline-block w-full py-3 px-6 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-colors uppercase tracking-wider text-sm"
                    >
                        Réessayer
                    </Link>
                </div>

                <p className="text-xs text-zinc-500">
                    Si le problème persiste, contacte l&apos;administrateur.
                </p>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4 font-sans antialiased bg-[radial-gradient(circle_at_center,rgba(39,39,42,0.4)_0,rgba(9,9,11,1)_100%)]">
            <Suspense fallback={
                <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-zinc-800 h-10 w-10"></div>
                </div>
            }>
                <ErrorContent />
            </Suspense>
        </main>
    );
}
