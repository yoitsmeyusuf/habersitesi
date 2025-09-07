using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace habersitesi_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedAtToComments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "Comments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                table: "Comments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Comments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Comments");
        }
    }
}
