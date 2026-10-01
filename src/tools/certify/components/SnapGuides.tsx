/** Thin accent-deep lines shown while a box is snapped to a template midline. */
export default function SnapGuides({ x, y }: { x: boolean; y: boolean }) {
  return (
    <>
      {x && <span className="guide v" style={{ left: '50%' }} aria-hidden="true" />}
      {y && <span className="guide h" style={{ top: '50%' }} aria-hidden="true" />}
    </>
  )
}
