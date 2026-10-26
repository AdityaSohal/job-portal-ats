import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";
import { buttonClass } from "../components/ui";

export default function NotFound() {
  return (
    <div className="grid-paper grid min-h-screen place-items-center px-5">
      <div className="text-center">
        <Logo />
        <p className="mt-10 text-7xl font-extrabold tracking-tight">404</p>
        <p className="mt-2 text-ink/70">That page doesn't exist.</p>
        <Link to="/" className={`${buttonClass("primary")} mt-6`}>
          Back to home
        </Link>
      </div>
    </div>
  );
}