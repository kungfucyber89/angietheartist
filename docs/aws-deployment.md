# Deploying angiestudio.org on AWS (console walkthrough)

This guide hosts the site at **https://angiestudio.org** using only the AWS web console. It was written while doing the setup for the first time, so it includes the problems hit along the way.

## Architecture

```
Visitor ──HTTPS──▶ Route 53 (DNS: angiestudio.org, www)
                        │  alias records
                        ▼
                   CloudFront (CDN + HTTPS, certificate from ACM in us-east-1)
                        │  Origin Access Control (private read)
                        ▼
                   S3 bucket in us-west-2 (private, Block Public Access ON)
```

| Service | Role |
|---|---|
| **Route 53** | Registers the domain and answers DNS for it (the hosted zone) |
| **AWS Certificate Manager (ACM)** | Free TLS/HTTPS certificate for `angiestudio.org` and `www.angiestudio.org` |
| **S3** | Stores the site files (`index.html`, `css/`, `js/`, `images/`) |
| **CloudFront** | Serves the files over HTTPS from edge locations worldwide and caches them |

Why not a public S3 website? The account has S3 Block Public Access turned on for every bucket, and an S3 website endpoint only supports HTTP. With CloudFront plus Origin Access Control (OAC), the bucket stays private and the site gets HTTPS.

## Console links

| What | Link |
|---|---|
| S3 buckets (us-west-2) | https://s3.console.aws.amazon.com/s3/home?region=us-west-2 |
| Site bucket `angiestudio-org-site` | https://s3.console.aws.amazon.com/s3/buckets/angiestudio-org-site?region=us-west-2&tab=objects |
| ACM certificates (us-east-1) | https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/list |
| CloudFront distributions | https://console.aws.amazon.com/cloudfront/v4/home#/distributions |
| Route 53 hosted zones | https://console.aws.amazon.com/route53/v2/hostedzones |
| Route 53 registered domains | https://console.aws.amazon.com/route53/domains/home#/ |
| Billing → payment methods | https://console.aws.amazon.com/billing/home#/paymentmethods |
| Budgets | https://console.aws.amazon.com/billing/home#/budgets |

> When you're signed in to more than one AWS account in the browser, the console uses addresses like `https://<account-id>-<session>.us-west-2.console.aws.amazon.com/...`. The generic links above redirect to whichever account you're signed in to, and they don't put an account ID in this public repo.

## Cost (approximate)

| Item | Cost |
|---|---|
| Domain `angiestudio.org` (Route 53) | $16/year |
| Route 53 hosted zone | $0.50/month (about $6/year) |
| ACM certificate | Free |
| CloudFront | Free tier: 1 TB of data and 10M requests per month |
| S3 storage (< 100 MB) | A few cents per month |
| **Total** | **About $22/year** |

## Progress

- [x] Step 1: Register domain (`angiestudio.org` registered 2026-11-10, hosted zone created automatically)
- [ ] Step 2: Request HTTPS certificate in ACM (us-east-1). Requested 2026-11-10 16:19; validation CNAMEs created 16:35 and confirmed live with `dig`; waiting for **Issued**
- [x] Step 3: Create a private S3 bucket and upload the site. Bucket `angiestudio-org-site` created in the console (us-west-2); all 42 site files (68.5 MB) uploaded with the CLI and verified against `git ls-files`
- [ ] Step 4: Create the CloudFront distribution and add the bucket policy
- [ ] Step 5: Add Route 53 alias records for `angiestudio.org` and `www`
- [ ] Step 6: Test over HTTPS
- [ ] Set a budget alert

---

## Step 1: Register the domain (Route 53)

1. **Route 53 → Domains → Registered domains → Register domains**
2. Search for the name, then **Select** it. **Check that the cart on the right shows the exact domain you want.** The cart kept the previous search result more than once.
3. A "Secure your brand across other extensions" pop-up offers more endings. Click **Skip**.
4. **Proceed to checkout**
   - Duration: 1 year, with **auto-renew on**
   - Contact type: Person. Fill in every required field, including **Country, State and ZIP**
   - Admin, Tech and Billing contacts: same as the registrant
   - **Privacy protection: on.** It hides your name, address and phone from public WHOIS records
5. Review, accept the terms and submit.
6. Track progress under **Domains → Requests**.
7. Click the **email verification** link if AWS sends one. Unverified domains are suspended after about 15 days.

### What happened

- `angiestudio.com` and similar `.com` names were already taken. The console's warning "We are not sure about the availability" appears even for available names. A `whois <domain>` lookup in a terminal gives a quicker answer.
- The first attempt (`angiestudio.net`) **failed** with "We can't finish registering your domain. Contact AWS Support." The domain itself was available. Adding a new **default payment method** under Billing → Payment methods fixed it. Soon after, AWS sent an "Amazon Registrar Sign-Up Confirmation" email, which means the registrar service was activated on the account. The failed attempt was not charged.
- The second attempt (`angiestudio.org`) succeeded. The public registry showed the domain within about 3 minutes, but the **Requests** page stayed "In progress" much longer, and confirmation emails lagged too. To check sooner, run `whois angiestudio.org`, or look at **Billing → Download billing report**, where a `REGISTER_DOMAIN` line appears.
- Route 53 automatically created a **hosted zone** with 2 records: **NS** (the name servers) and **SOA**. Don't edit or delete them.

## Step 2: Request an HTTPS certificate (ACM)

> ⚠️ The certificate **must be in us-east-1 (N. Virginia)**. CloudFront only uses ACM certificates from that region.

1. Open ACM in us-east-1: https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/request
2. **Request a public certificate → Next**
3. Domain names: `angiestudio.org`, then **Add another name** for `www.angiestudio.org`
4. Validation method: **DNS validation**. Key algorithm: **RSA 2048**
5. **Request**
6. Open the certificate → **Create records in Route 53** → make sure both names are ticked → **Create records**. This adds CNAME records that prove you own the domain.
7. Wait until the status changes from **Pending validation** to **Issued** (usually 5–30 minutes).

### Why these settings

| Setting | Choice | Why |
|---|---|---|
| Certificate type | **Public** | Browsers trust it. Private certificates are for internal networks and need your own certificate authority |
| Domain names | `angiestudio.org` **and** `www.angiestudio.org` | A certificate covers only the exact names listed. Without `www`, anyone who types `www.angiestudio.org` gets a "Your connection is not private" warning. You can't add names to an existing certificate later; you'd have to request a new one and switch CloudFront to it |
| Allow export | **Disable export** | Free. The private key never leaves AWS, AWS renews automatically, and the certificate works with CloudFront. Export costs money and is only for using the certificate on your own servers |
| Validation | **DNS validation** | Proves ownership with a DNS record that stays in place, so renewals happen automatically. Email validation is deprecated and needs manual clicks every year |
| Key algorithm | **RSA 2048** | Works with every browser and AWS service. ECDSA is newer and smaller, but the difference doesn't matter for a portfolio site |

See [How HTTPS certificates work](#how-https-certificates-work) below for the background.

### Reading the certificate page

Right after **Request**, the certificate shows **Pending validation**. The page fields mean:

| Field | Meaning |
|---|---|
| **Identifier** | The certificate's ID inside ACM |
| **ARN** (`arn:aws:acm:us-east-1:<account-id>:certificate/<id>`) | Amazon Resource Name: the unique, global ID of any AWS resource, in the form `arn:aws:<service>:<region>:<account>:<resource>`. The `us-east-1` part confirms it is usable by CloudFront |
| **Status: Pending validation** | AWS is waiting to see the DNS validation records. It changes to **Issued** once they're found |
| **Key source: AWS managed** / **Export option: Disabled** | The private key stays inside AWS |
| **Type: Amazon Issued** | Amazon is the certificate authority that signs it |
| **Domains → CNAME name / CNAME value** | One validation record per domain: `_<random>.angiestudio.org` → `_<random>.<...>.acm-validations.aws`. **Create records in Route 53** adds them to the hosted zone (or copy them by hand at any other DNS provider). Never delete them; renewals depend on them |
| **In use: No** | Nothing uses the certificate yet. It becomes **Yes** after it's attached to CloudFront in Step 4 |
| **Renewal eligibility: Ineligible** | Normal before it's issued and in use. It becomes **Eligible** after that, and ACM renews it automatically |
| **Issued at / Not before / Not after: N/A** | Filled in once issued. *Not after* is the expiry, about 13 months out; ACM renews before then |
| **Signature algorithm: SHA-256 with RSA** | How the certificate authority signs the certificate |
| **Can be used with** | CloudFront, Elastic Load Balancing, API Gateway and other integrated services |

Status changes to **Issued** usually within 5–30 minutes after the validation records are created. Use the wait to do Step 3.

### The validation records

**Export to CSV** on the certificate page downloads the same records as `DNS_Configuration.csv`. For this certificate:

| Covers | Type | Name (record to create) | Value (points to) |
|---|---|---|---|
| `angiestudio.org` | CNAME | `_24742df1f5324ce6651d1b63f45de206.angiestudio.org.` | `_dfa7025efe2f0d25c65d05795524beaa.wzccmgtwzk.acm-validations.aws.` |
| `www.angiestudio.org` | CNAME | `_c3cd0ab97d07884139b699e10a68fa36.www.angiestudio.org.` | `_44d1e61610621919e582f54a3bf38e5f.wzccmgtwzk.acm-validations.aws.` |

- These are public by design and not secret: anyone can look them up once they're published.
- The **trailing dot** means "fully qualified name" (complete, nothing appended). DNS tools accept them with or without.
- If you add them by hand in the Route 53 console, the **Record name** box only takes the part before the zone name, e.g. `_24742df1f5324ce6651d1b63f45de206` (Route 53 appends `.angiestudio.org`).
- The CSV is mainly for DNS hosted *outside* AWS (Cloudflare, GoDaddy, Namecheap…), where you paste these two records in yourself. With Route 53, the button below does it.

### Create records in Route 53

Certificate page → **Domains** box → **Create records in Route 53** opens *Create DNS records in Amazon Route 53 (2/2)*:

- Both domains are listed and ticked, with **Validation status: Pending validation** and **Is domain in Route 53?: Yes**. *Yes* means ACM found the `angiestudio.org` hosted zone in this account and can write to it directly.
- The pre-set filters (*Pending validation or Failed* and *in Route 53 = Yes*) just hide domains that are already validated or whose DNS is elsewhere. Leave them as they are.
- Click **Create records**. You return to the certificate page with a success banner, and the two CNAMEs now appear in **Route 53 → Hosted zones → angiestudio.org** (record count goes from 2 to 4).

### Checking the records from a terminal

The console can lag, so asking DNS directly is the quickest way to see what's really published:

```bash
# Which name servers does the .org registry say are in charge of the domain? (should be 4 awsdns servers)
whois angiestudio.org | grep -i "name server"

# Ask one of those Route 53 servers directly (authoritative, so no cache delay)
dig +short CNAME _24742df1f5324ce6651d1b63f45de206.angiestudio.org @ns-1219.awsdns-24.org
dig +short CNAME _c3cd0ab97d07884139b699e10a68fa36.www.angiestudio.org @ns-1219.awsdns-24.org

# Ask a public resolver (what the rest of the internet sees; may lag behind)
dig +short CNAME _24742df1f5324ce6651d1b63f45de206.angiestudio.org @8.8.8.8
```

- **No output** means the record doesn't exist (yet). Output ending in `.acm-validations.aws.` means it's live.
- `dig +short SOA angiestudio.org @ns-1219.awsdns-24.org` returning a line shows the hosted zone itself is answering.
- What we saw on 2026-11-10: the registry listed the 4 Route 53 name servers (status `addPeriod`, which every newly registered domain has for its first 5 days) and the hosted zone answered, but the CNAMEs returned nothing until **Create records** was clicked.

## Step 3: Create a private S3 bucket and upload the site

1. Region: **US West (Oregon) us-west-2**
2. **S3 → Create bucket**: https://s3.console.aws.amazon.com/s3/bucket/create?region=us-west-2
   - Type: General purpose
   - Name: `angiestudio-org-site` (bucket names are unique across all of AWS)
   - Leave **Block all public access ON** and the other settings at their defaults
3. Open the bucket → **Upload**
   - **Add files:** `index.html`
   - **Add folder:** `css`, `js` and `images`, one at a time
   - Don't upload `.git`, `docs/`, `README.md`, `FETCH_HEAD`, `.DS_Store` or other stray files
   - Tip: in the macOS file picker, press **Cmd+Shift+G** and paste `~/Documents/dev/angietheartist`
4. **Upload**, then wait for "Upload succeeded".

### Create-bucket settings explained

| Setting | Choice | Why |
|---|---|---|
| **AWS Region** | US West (Oregon) `us-west-2` | Close to San Diego. CloudFront can fetch from any region, and only cache misses travel here |
| **Bucket type** | General purpose | The standard S3 bucket, stored across multiple Availability Zones. *Directory* buckets (S3 Express One Zone) are for very low-latency workloads in one zone |
| **Bucket namespace** | **Global namespace** | The classic, well-documented naming that every CloudFront and OAC guide assumes. The console labels *Account Regional namespace* "recommended": it makes the name unique to your account so no one else can ever take it, but it's a newer option and not needed here |
| **Bucket name** | `angiestudio-org-site` | 3–63 characters: lowercase letters, numbers, hyphens and dots. Must be unique worldwide in the global namespace; if taken, add a suffix |
| **Copy settings from existing bucket** | Skip | Only useful to clone another bucket's configuration |
| **Object Ownership** | **ACLs disabled (Bucket owner enforced)** | Access is controlled only by policies. OAC relies on the bucket policy, not per-object ACLs |
| **Block Public Access** | **Block all public access ON** (all 4 boxes) | Nothing in the bucket can ever be made public. The banner "Block Public Access settings for this account are currently turned on" means the account-wide switch also enforces this |
| **Bucket Versioning** | Disable | Versioning keeps every old copy of overwritten or deleted files, which is good for recovery but uses more storage. The site's source of truth is GitHub, so it isn't needed |
| **Tags** | **`project = angie-site`** (recommended) | Labels for organizing, cost reports and access control. See [Tags](#tags) |
| **Default encryption** | **SSE-S3** (Amazon S3 managed keys) | Free, automatic encryption at rest, and CloudFront reads it with no extra setup. SSE-KMS / DSSE-KMS cost more and would require giving CloudFront permission on the KMS key |
| **Bucket Key** | Enable (default) | Only reduces costs for SSE-KMS. Has no effect with SSE-S3 |
| **Advanced settings → Object Lock** | Disabled (default) | Object Lock makes files undeletable for a retention period (for compliance), which you don't want for a site that changes |

### The 4 Block Public Access settings

**Block *all* public access** turns on all four of these. Each one closes a different way a bucket could become public:

| # | Setting | What it blocks |
|---|---|---|
| 1 | Block public access granted through **new** ACLs | Stops anyone from adding *new* public ACLs (per-object or per-bucket "everyone can read" permissions) |
| 2 | Block public access granted through **any** ACLs | Ignores *all* public ACLs, including ones that already exist |
| 3 | Block public access granted through **new** public bucket or access point policies | Rejects saving a bucket policy that grants public access (e.g. `"Principal": "*"`) |
| 4 | Block public and cross-account access through **any** public bucket or access point policies | Ignores existing public policies, so only AWS services and authorized users in this account get access |

- Settings 1–2 cover **ACLs**, the old per-object permission system. Settings 3–4 cover **policies**, the modern JSON permission documents.
- The CloudFront bucket policy from Step 4 is **not** public: it names one specific service (`cloudfront.amazonaws.com`) and one specific distribution, so all four settings can stay on.
- They exist at two levels: **account** (applies to every bucket, and it's on in this account) and **bucket**. The stricter one always wins.

### Encryption options

| Option | Who manages the key | Cost | Works with CloudFront OAC |
|---|---|---|---|
| **SSE-S3** (chosen) | Amazon S3, completely automatic | Free | Yes, no extra setup |
| **SSE-KMS** | AWS KMS key (AWS-managed or your own) | KMS request charges; your own key is $1/month | Yes, but the KMS key policy must allow CloudFront to decrypt |
| **DSSE-KMS** | Two layers of KMS encryption | Higher | Same as SSE-KMS; for strict compliance requirements |

- All of these are **encryption at rest**: files are encrypted on AWS's disks and decrypted automatically for anyone allowed to read them. They don't hide anything from authorized readers. HTTPS covers **encryption in transit**.
- **Bucket Key** batches KMS calls to cut SSE-KMS costs. With SSE-S3 it does nothing, so leaving it on (the default) is harmless.
- Public website files don't need anything stronger than SSE-S3.

### Versioning and Object Lock

- **Versioning ON** keeps every previous version of an object. Overwrites and deletes become recoverable, but you pay to store every old copy. Once enabled it can only be *suspended*, never fully turned off.
- For this site, **GitHub is the backup and history**, so versioning stays **off**.
- **Object Lock** (Advanced settings) makes objects *undeletable* for a retention period, for legal or compliance archives. It requires versioning and is wrong for a website you update. Leave it off.

### Tags

A **tag** is a `key = value` label on an AWS resource. Recommended for this project:

| Key | Value |
|---|---|
| `project` | `angie-site` |

What tags give you:
- **Organization:** **Resource Groups & Tag Editor** can find every resource with `project = angie-site` across services and regions.
- **Cost tracking:** activate `project` under **Billing → Cost allocation tags**, then **Cost Explorer** can show the site's cost separately from everything else. Tracking starts when you activate it, not retroactively.
- **Access control:** IAM policies can allow or deny actions based on tags (advanced).

Tips:
- Use the **same tag on every resource** for the site: the S3 bucket, the CloudFront distribution, the ACM certificate (**Manage tags**) and the Route 53 hosted zone.
- Keys and values are **case-sensitive**. Pick lowercase and stick with it.
- **Never put secrets in tags.** Anyone with read access to the account can see them.
- Tags can be added or changed anytime (S3: bucket → **Properties → Tags**).

### Uploading in the console

1. Open the bucket → **Upload**.
2. **Add files** → `index.html`.
3. **Add folder** → `css`, then `js`, then `images` (one at a time; the console keeps the folder names as key prefixes like `images/drawings/…`).
4. In the macOS file picker, **Cmd+Shift+G** opens "Go to folder". Paste `~/Documents/dev/angietheartist`.
5. Check the file list (only site files, no `.git`, `docs/`, `.DS_Store`), then **Upload** and wait for **Upload succeeded**.

### Uploading with the CLI (what was actually done)

Instead of clicking through the console, the files were uploaded from a terminal. Uploading exactly the files git tracks guarantees no stray files (`.DS_Store`, unused images, `docs/`) end up on the website:

```bash
cd ~/Documents/dev/angietheartist

# Upload every tracked site file, keeping the same paths as keys
git ls-files -- index.html css js images | while IFS= read -r f; do
  aws s3 cp "$f" "s3://angiestudio-org-site/$f" --only-show-errors
done

# Verify: count/size, then exact key list vs. git
aws s3 ls s3://angiestudio-org-site --recursive --summarize | tail -2
diff <(git ls-files -- index.html css js images | sort) \
     <(aws s3api list-objects-v2 --bucket angiestudio-org-site \
         --query 'Contents[].Key' --output text | tr '\t' '\n' | sort) \
  && echo "bucket matches git"

# Spot-check Content-Type (browsers need the right one to render files)
aws s3api head-object --bucket angiestudio-org-site --key index.html --query ContentType
```

Result: **42 objects, 68,480,425 bytes**, key list identical to git. Content types were set automatically from file extensions: `text/html`, `text/css`, `text/javascript`, `image/jpeg` and `image/png`.

Notes:
- `while IFS= read -r f` reads one path per line and keeps spaces intact, which matters for files like `images/drawings/Drawing No. 5.png`. Always quote `"$f"`.
- `aws s3 cp` guesses `Content-Type` from the extension. If a file ever shows as a download instead of displaying, check its content type with `head-object`.
- The CLI used the `personal` profile, which has S3 permissions. CloudFront steps still need the console (or broader IAM permissions).

### Separate bucket per purpose

Keep the website in its own bucket instead of sharing one with backups or private files:
- **Buckets are free.** You pay only for storage and requests, and an account can have 10,000 by default.
- **Isolation:** the CloudFront bucket policy grants read access to the whole bucket. Sharing a bucket with private files would risk exposing them through one wrong policy.
- **Easy cleanup:** retiring the site means deleting one bucket.
- **Tip:** a consistent naming pattern (`<owner>-<purpose>-<account-id>`, or `<site>-site`) plus tags keeps the bucket list readable.

## Step 4: Create the CloudFront distribution

1. **CloudFront → Create distribution**
2. **Origin domain:** pick the S3 bucket from the list (`angiestudio-org-site.s3.us-west-2.amazonaws.com`), **not** an S3 website endpoint
3. **Origin access:** Origin access control settings (recommended) → **Create new OAC** with the defaults
4. **Viewer protocol policy:** Redirect HTTP to HTTPS
5. **WAF:** Do not enable security protections (WAF costs extra)
6. **Alternate domain names (CNAMEs):** `angiestudio.org` and `www.angiestudio.org`
7. **Custom SSL certificate:** choose the certificate from Step 2. It only appears once it is **Issued**
8. **Default root object:** `index.html`
9. If a pricing plan choice appears, the free or pay-as-you-go option is enough
10. **Create distribution**
11. **Bucket policy:** a banner shows a policy to copy. Copy it, then go to **S3 → bucket → Permissions → Bucket policy → Edit**, paste and save. Without this, CloudFront gets *AccessDenied*.
12. Wait until **Last modified** changes from "Deploying" to a date (5–15 minutes).

## Step 5: Point the domain at CloudFront (Route 53)

1. **Route 53 → Hosted zones → angiestudio.org → Create record**
2. Record 1: name *(empty)*, type **A**, **Alias ON**, route traffic to **Alias to CloudFront distribution**, then pick the distribution → **Create records**
3. Record 2: the same, with name `www`
4. Optional: repeat both with type **AAAA** for IPv6

## Step 6: Test

- https://angiestudio.org
- https://www.angiestudio.org
- http://angiestudio.org should redirect to HTTPS

DNS changes can take a few minutes to spread. A padlock in the address bar means HTTPS is working.

## Budget alert (recommended)

**Billing and Cost Management → Budgets → Create budget**, use the *Monthly cost budget* template, set the limit to **$5**, and add your email address.

---

## Updating the site later

1. Make and test the changes locally (`python3 -m http.server 8000`, see the README).
2. Commit and push to GitHub as usual.
3. **S3 → bucket → Upload** the changed files to the same paths. They overwrite the old ones. Or from a terminal, upload only what changed:
   ```bash
   cd ~/Documents/dev/angietheartist
   aws s3 sync . s3://angiestudio-org-site/ \
     --exclude "*" --include "index.html" --include "css/*" --include "js/*" --include "images/*" \
     --exclude "*.DS_Store"
   ```
   `sync` compares size and timestamp and uploads only new or changed files. Add `--delete` to also remove files from the bucket that were deleted locally (check with `--dryrun` first).
4. **CloudFront → distribution → Invalidations → Create invalidation** with path `/*`. This clears the cache so visitors see the change right away. The first 1,000 paths each month are free.

## AWS concepts explained

### Regions and global services

- AWS runs data centers in many **regions** (e.g. `us-west-2` Oregon, `us-east-1` N. Virginia). Most resources live in one region, and you pick it from the top-right of the console. If something "disappears", you're probably looking at the wrong region.
- Some services are **global**: Route 53, CloudFront and IAM show "Global" in the region picker.
- **Special case: why the certificate is in us-east-1.**
  - ACM certificates are **regional**: one created in `us-west-2` exists only there. Most services (e.g. a load balancer) need a certificate in *their own* region.
  - CloudFront isn't in one region. It runs at hundreds of edge locations, and AWS manages it from **`us-east-1`** (N. Virginia, AWS's original region). So CloudFront only looks for certificates in `us-east-1`.
  - When you attach the certificate, CloudFront securely copies it to every edge location, so one certificate gives HTTPS to visitors worldwide.
  - If you create it in another region, it **won't show up** in CloudFront's certificate dropdown. This is the most common mistake.
  - The same rule applies to other things attached to CloudFront itself: WAF web ACLs for CloudFront and Lambda@Edge functions.
  - **Rule of thumb:** anything attached *to* CloudFront goes in `us-east-1`; the origin CloudFront reads *from* (the S3 bucket) can be in any region. This bucket is in `us-west-2`, close to San Diego.

### Route 53: registrar vs. DNS

Route 53 does two separate jobs, which is why its menu has both "Registered domains" and "Hosted zones":

1. **Registrar:** you rent the *name* `angiestudio.org` from the `.org` registry for a year at a time. That's the $16/year. You could buy the name from any registrar (Cloudflare, Porkbun, etc.) and still use AWS for everything else.
2. **DNS hosting (the hosted zone):** the phone book that tells the internet *where* the name points. That's the $0.50/month.

Records in the hosted zone:

| Record | What it does |
|---|---|
| **NS** (name server) | Lists the 4 AWS servers that answer questions about `angiestudio.org`. The registrar tells the `.org` registry to use these. If the domain were bought elsewhere, you'd copy these 4 into that registrar |
| **SOA** (start of authority) | Admin info about the zone. Never edit it |
| **A** | Maps a name to an IPv4 address |
| **AAAA** | Maps a name to an IPv6 address |
| **CNAME** | Says "this name is an alias of another name". The certificate validation records are CNAMEs |
| **Alias** (AWS-only) | Like a CNAME, but works on the root domain (`angiestudio.org` with nothing in front) and points directly at AWS resources like CloudFront. Free to query |

The **root domain** (or apex), `angiestudio.org`, can't have a normal CNAME under DNS rules. That's why Step 5 uses an **A record with Alias ON** instead.

#### What is a CNAME?

A **CNAME** (canonical name) record says: *"this name is a nickname for another name; look that one up instead."*

- An **A record** is a direct phone-book entry: name → IP address.
- A **CNAME** is a forwarding note: name → another name, which eventually resolves to an IP address through an A record.

```
www.shop.com.        CNAME   shops.myhost.com.
shops.myhost.com.    A       203.0.113.10
```

The browser asks for `www.shop.com`, learns it's an alias for `shops.myhost.com`, looks that up and gets `203.0.113.10`. If the host changes IP addresses, the alias follows automatically.

**How ACM uses CNAMEs to prove ownership:**

```
_24742df1....angiestudio.org.   CNAME   _dfa7025e....acm-validations.aws.
```

ACM invents a random name under your domain and asks you to publish it. Only someone who controls the domain's DNS can do that, so when ACM sees the record, ownership is proven. Visitors never use it. It must stay in place for automatic renewals.

**Rules:**
1. **No CNAME on the root domain.** The root must also hold NS and SOA records, and a CNAME can't coexist with any other record of the same name.
2. **Route 53 Alias records are the workaround.** They behave like a CNAME pointing at an AWS resource (CloudFront, a load balancer, an S3 website), but Route 53 resolves them internally and returns the IP addresses directly. That makes them allowed on the root domain, and the lookups are free.
3. **A CNAME always points to a name, never an IP address.** For an IP address, use an A or AAAA record.
4. **Each CNAME adds one extra lookup,** which is negligible in practice.

**DNS propagation:** DNS answers are cached for a time set by each record's **TTL** (time to live). New records are visible within seconds to minutes; *changes* to existing records can take as long as the old TTL.

### How HTTPS certificates work

- HTTPS uses **TLS** to (1) encrypt traffic between the visitor and the server, and (2) prove the server really is `angiestudio.org`.
- A **certificate** binds a domain name to a **public key** and is signed by a **certificate authority (CA)** that browsers trust. Amazon is a CA.
- The matching **private key** stays secret on the server. Anyone holding it can pretend to be the site. That's why *Disable export* is the safer choice: the key never leaves AWS.
- **Domain validation:** a CA must check that you control the domain before issuing a certificate. With DNS validation, ACM gives you a CNAME with random-looking values, and only the domain's owner can publish it. **Keep that record forever:** ACM rechecks it at every automatic renewal (ACM certificates last about 13 months and renew themselves).
- **Names on a certificate:** each exact hostname must be listed (`angiestudio.org` and `www.angiestudio.org` are different names). A **wildcard** like `*.angiestudio.org` covers one level of subdomains, but not the root itself.
- **RSA vs. ECDSA:** two kinds of key math. RSA 2048 is the universal default. ECDSA P-256 is smaller and faster with equal strength. Both are secure.

### S3: buckets and objects

#### Useful S3 CLI commands

```bash
aws s3 ls                                          # list buckets
aws s3 ls s3://BUCKET --recursive --summarize      # every object + total count and size
aws s3api get-bucket-location --bucket BUCKET      # region ("None" means us-east-1)
aws s3 sync s3://SRC s3://DEST/prefix/             # copy everything (server-side, nothing downloaded)
aws s3 rb s3://BUCKET --force                      # empty and delete a bucket (permanent!)
```

**ETags and verifying copies:** S3's `ETag` is the MD5 of the file only for single-part uploads. Large files uploaded in parts get an ETag like `"…-7"` (the number of parts), which depends on part size. So the *same* file can have different ETags after a copy. To verify, compare key and size, and for any ETag mismatch, download both and compare `shasum -a 256`.

- A **bucket** is a container for files; each file is an **object** with a **key** (its path, e.g. `images/drawings/drawing-no25.jpg`). There are no real folders: the console fakes them from the `/` in keys.
- Bucket names are **globally unique** across all AWS accounts.
- Keys are **case-sensitive** and must match the paths in `index.html` exactly, spaces included.
- **Block Public Access** is a safety switch that overrides any setting that would make objects public. This account has it on for every bucket, and that's good: CloudFront reads the bucket privately, so nothing in S3 is ever public.
- S3 sets each object's **Content-Type** (e.g. `text/html`, `image/png`) from its file extension when uploading through the console. Browsers rely on it to display files correctly.

### CloudFront: the CDN

#### What happens on a visit

```
1. Browser: "where is angiestudio.org?"
        │
        ▼
   Route 53 (DNS) ── Alias record ──▶ "go to CloudFront, nearby edge IP"
        │
        ▼
2. Browser ──HTTPS──▶ nearest CloudFront edge (e.g. Los Angeles)
        │              • presents the ACM certificate → padlock
        │              • file cached? ──yes──▶ return it (S3 not touched)
        │                           └─no──┐
        ▼                                 ▼
3. Edge ──signed request (OAC)──▶ S3 bucket angiestudio-org-site (us-west-2)
                                   • bucket policy: allow reads from THIS distribution only
                                   • returns the file → edge caches it → sends to browser
```

- **Cache hit:** most requests are answered by the edge without touching S3. That's why the site is fast and costs almost nothing.
- **Cache miss:** the edge fetches from S3 once, then serves its copy until it expires (24 hours by default) or is invalidated.
- **Private bucket:** with Block Public Access ON, a direct S3 address (`https://angiestudio-org-site.s3.us-west-2.amazonaws.com/index.html`) returns **AccessDenied**. CloudFront is the only way in.
- **Bucket settings that matter for CloudFront:**
  - **ACLs disabled:** OAC is authorized by the bucket policy, not per-object ACLs.
  - **SSE-S3 encryption:** S3 decrypts objects for CloudFront transparently. SSE-KMS would also require granting CloudFront access to the KMS key.
  - **Global namespace:** the standard bucket naming that every CloudFront and OAC guide assumes.

- A **CDN** (content delivery network) keeps copies of your files at **edge locations** around the world, so visitors download from somewhere nearby instead of from Oregon.
- A **distribution** is one CloudFront configuration. It gets a default address like `d1234abcd.cloudfront.net`, plus your **alternate domain names** (`angiestudio.org`, `www`).
- The **origin** is where CloudFront fetches files from when it doesn't have them cached: here, the S3 bucket.
- **Origin Access Control (OAC):** CloudFront signs its requests to S3, and the **bucket policy** says "allow reads only from this CloudFront distribution". Result: the bucket is private, and the only way in is through CloudFront.
- **Default root object:** which file to serve for `/`. Without `index.html` here, the home page returns an error.
- **Caching and invalidations:** edges keep files for a while (24 hours by default). After uploading changes, an **invalidation** (`/*`) tells every edge to throw away its copy and fetch a fresh one.
- **Viewer protocol policy → Redirect HTTP to HTTPS:** anyone visiting `http://` is sent to `https://` automatically.

### Bucket policies and IAM

- **IAM** (Identity and Access Management) controls *who can do what*. Permissions come from **policies**: JSON documents listing allowed actions (e.g. `s3:GetObject`) on resources (e.g. a bucket).
- **Identity-based policies** attach to users or roles. For example, the CLI user `abby-files-backup` only has S3 permissions, which is why the CLI got `AccessDenied` for CloudFront.
- **Resource-based policies** attach to a resource. The S3 **bucket policy** from Step 4 is one: it lets the CloudFront service read objects, but only for requests from this distribution.
- The **root user** (the account's sign-up email) can do anything, including billing. Protect it with MFA, and for everyday work prefer an IAM user or IAM Identity Center user with only the permissions you need (**least privilege**).

### Billing basics

- Route 53 domain charges appear right away in **Billing → Download billing report** for Route 53 domains. Everything else is billed monthly.
- **Free tier:** CloudFront's always-free allowance (1 TB of data, 10M requests per month) easily covers a portfolio site.
- **Budgets** send an email when spending passes a limit you set. They're an early warning, not a hard cap.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Domain registration **Failed**, "Contact AWS Support" | Payment method or account not ready for Amazon Registrar. Set a valid default card, try again, or open a support case (Account and billing → Domains → Registration issue) with the Operation ID |
| Certificate missing from the CloudFront dropdown | It was created outside **us-east-1**, or it isn't **Issued** yet |
| Certificate stuck on *Pending validation* | Validation CNAMEs weren't created. Click **Create records in Route 53** again |
| `AccessDenied` XML page | Bucket policy from Step 4 not saved, or **Default root object** isn't `index.html` |
| `403` on an image | File name or case mismatch. S3 paths are case-sensitive and must match `index.html` exactly (some files have spaces, e.g. `Drawing No. 5.png`) |
| Old content still shows | Create a CloudFront invalidation for `/*` |
| Site not found | Alias records missing or just created. Wait 5–10 minutes |
