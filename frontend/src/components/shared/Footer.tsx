import Logo from "@/components/shared/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-primary-900 px-8 py-8 text-white">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-12">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
            Smarter inventory. Stronger operations.
          </p>
        </div>
        <p className="max-w-xs text-right text-xs leading-5 text-white/55">
          Inventory visibility for receiving, storage, and outbound operations.
        </p>
      </div>
    </footer>
  );
}