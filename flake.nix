{
  description = "DJ Turntable Live Wallpaper - reproducible dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_24
            git
            jq
            curl
            gh
          ];

          shellHook = ''
            echo "DJ Turntable Live Wallpaper dev shell"
            echo "node $(node --version) / npm $(npm --version)"
            echo "  npm install && npm run dev"
            echo "  npm test / npm run typecheck / npm run build"
          '';
        };
      });
}
