import React, { useState } from 'react'

export default function Navbar({ current }) {
    const [menuOpen, setMenuOpen] = useState(false);
    
    
    const NavLink = ({ text, href, current }) => {

        if (current) {
            return (
                <>
                    <li>
                        <a href={href} className="block py-2 px-3 text-white bg-blue-700 rounded-lg dark:bg-blue-600" aria-current="page">{text}</a>
                    </li>
                </>
            )
        } else {
            return (
                <>
                    <li>
                        <a href={href} className="block border border-gray-200 dark:border-gray-800 py-2 px-3 text-gray-900 rounded-lg bg-white dark:text-white dark:bg-gray-900 dark:hover:text-white hover:border-blue-300 hover:dark:border-blue-900 transition-colors">{text}</a>
                    </li>
                </>
            )
        }
        
    }
  return (
    <>
        <nav className="border-gray-200 bg-gray-100 dark:bg-black dark:border-gray-700 sticky top-0 z-50">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <a href="#" className="flex items-center space-x-3 rtl:space-x-reverse">
                    <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white"></span>
                </a>
                <button data-collapse-toggle="navbar-hamburger" type="button" className="inline-flex items-center justify-center p-2 w-10 h-10 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="navbar-hamburger" aria-expanded="false" onClick={() => setMenuOpen(!menuOpen)}>
                <span className="sr-only">Open main menu</span>
                <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h15M1 7h15M1 13h15"/>
                </svg>
                </button>
                <div className={`${menuOpen ? 'block' : 'hidden'} w-full`} id="navbar-hamburger">
                <ul className="flex flex-col font-medium mt-4 gap-2 rounded-lg bg-gray-100 dark:bg-black dark:border-gray-700">
                    <NavLink text="Films" href="/" current={current === 'films'} />
                    <NavLink text="Abonnements" href="/brunch" current={current === 'abonnements'} />
                </ul>
                </div>
            </div>
        </nav>
    </>
  )
}
