import React from "react";

interface StardustButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}

export const StardustButton = ({
  children = "Launching Soon",
  onClick,
  className = "",
  fullWidth = false,
  disabled = false,
  type = "button",
  ...props
}: StardustButtonProps) => {
  const buttonStyle: React.CSSProperties = {
    outline: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    border: 0,
    position: "relative",
    borderRadius: 14,
    backgroundColor: "#1e3a5f",
    transition: "all 0.2s ease",
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? "100%" : undefined,
    boxShadow: `
      inset 0 0.3rem 0.9rem rgba(255, 255, 255, 0.15),
      inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.7),
      inset 0 -0.4rem 0.9rem rgba(100, 160, 230, 0.3),
      0 0.75rem 0.75rem rgba(0, 0, 0, 0.3),
      0 0.35rem 0.35rem -0.6rem rgba(0, 0, 0, 0.8)
    `,
  };

  const wrapStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(147, 197, 253, 0.9)",
    padding: "12px 24px",
    borderRadius: "inherit",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
  };

  const pStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 0,
    transition: "all 0.2s ease",
    transform: "translateY(2%)",
    maskImage:
      "linear-gradient(to bottom, rgba(147, 197, 253, 1) 40%, transparent)",
  };

  const uniqueId = React.useId().replace(/:/g, "");

  const beforeAfterStyles = `
    .stardust-btn-${uniqueId} .stardust-wrap::before,
    .stardust-btn-${uniqueId} .stardust-wrap::after {
      content: "";
      position: absolute;
      transition: all 0.3s ease;
    }

    .stardust-btn-${uniqueId} .stardust-wrap::before {
      left: -15%;
      right: -15%;
      bottom: 25%;
      top: -100%;
      border-radius: 50%;
      background-color: rgba(59, 130, 246, 0.12);
    }

    .stardust-btn-${uniqueId} .stardust-wrap::after {
      left: 6%;
      right: 6%;
      top: 12%;
      bottom: 40%;
      border-radius: 22px 22px 0 0;
      box-shadow: inset 0 10px 8px -10px rgba(147, 197, 253, 0.6);
      background: linear-gradient(
        180deg,
        rgba(59, 130, 246, 0.2) 0%,
        rgba(0, 0, 0, 0) 50%,
        rgba(0, 0, 0, 0) 100%
      );
    }

    .stardust-btn-${uniqueId} .stardust-wrap p span:nth-child(2) {
      display: none;
    }

    .stardust-btn-${uniqueId}:not(:disabled):hover .stardust-wrap p span:nth-child(1) {
      display: none;
    }

    .stardust-btn-${uniqueId}:not(:disabled):hover .stardust-wrap p span:nth-child(2) {
      display: inline-block;
    }

    .stardust-btn-${uniqueId}:not(:disabled):hover {
      box-shadow:
        inset 0 0.3rem 0.5rem rgba(147, 197, 253, 0.4),
        inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.7),
        inset 0 -0.4rem 0.9rem rgba(59, 130, 246, 0.5),
        0 0.75rem 0.75rem rgba(0, 0, 0, 0.3),
        0 0.35rem 0.35rem -0.6rem rgba(0, 0, 0, 0.8);
    }

    .stardust-btn-${uniqueId}:not(:disabled):hover .stardust-wrap::before {
      transform: translateY(-5%);
    }

    .stardust-btn-${uniqueId}:not(:disabled):hover .stardust-wrap::after {
      opacity: 0.4;
      transform: translateY(5%);
    }

    .stardust-btn-${uniqueId}:not(:disabled):hover .stardust-wrap p {
      transform: translateY(-4%);
    }

    .stardust-btn-${uniqueId}:not(:disabled):active {
      transform: translateY(2px);
      box-shadow:
        inset 0 0.3rem 0.5rem rgba(147, 197, 253, 0.5),
        inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.8),
        inset 0 -0.4rem 0.9rem rgba(59, 130, 246, 0.4),
        0 0.75rem 0.75rem rgba(0, 0, 0, 0.3),
        0 0.35rem 0.35rem -0.6rem rgba(0, 0, 0, 0.8);
    }
  `;

  return (
    <>
      <style>{beforeAfterStyles}</style>
      <button
        className={`stardust-btn-${uniqueId} ${className}`}
        style={buttonStyle}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        type={type}
        {...props}
      >
        <div className="stardust-wrap" style={wrapStyle}>
          <p style={pStyle}>
            <span>✧</span>
            <span>✦</span>
            {children}
          </p>
        </div>
      </button>
    </>
  );
};
