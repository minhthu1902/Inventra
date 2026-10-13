export default function About() {
  return (
    <section
      aria-labelledby="about-heading"
      className="border-y border-border bg-surface px-8 py-12"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-16">
        <div>
          <p className="mb-3 text-sm font-semibold text-primary-600">ABOUT INVENTRA</p>
          <h2
            id="about-heading"
            className="max-w-md text-4xl font-semibold leading-tight text-text-primary"
          >
            A clearer view of every movement.
          </h2>
        </div>
        <div className="border-l-2 border-primary-500 pl-8">
          <p className="text-lg leading-8 text-text-primary">
            Inventra is being built to support HEB&apos;s food inventory operations, bringing
            product records, stock movements, and warehouse activity into one clear workspace.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary">
            From receiving goods to tracking what leaves a location, the goal is to make
            everyday inventory work easier to follow and easier to manage.
          </p>
        </div>
      </div>
    </section>
  );
}